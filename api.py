import sys
import asyncio, json, os, pickle
from aiohttp import web
import logging as lg
from hypertiling import OriginNode, TileGenerationContext, NodeView

sys.setrecursionlimit(200000)

lg.basicConfig(
    format="[%(asctime)s — %(name)s — %(levelname)s] %(message)s",
    level=lg.INFO
)

SAVE_FILE = "world.pkl"
if os.path.isfile(SAVE_FILE):
    lg.info("Loading from file")
    WORLD = pickle.load(open(SAVE_FILE, "rb"))
    TileGenerationContext.TILE_CTR = WORLD.get_higest_idx() + 1
else:
    lg.info("No save found. Creating new")
    WORLD = OriginNode(TileGenerationContext(0))

WORLD_LOCK = asyncio.Lock()

DIRTY = False

def render(view, render_distance, seen_at):
    if view.node.idx in seen_at and seen_at[view.node.idx] >= render_distance:
        return None

    if render_distance <= 0:
        return None

    seen_at[view.node.idx] = render_distance

    neighbours = []
    for i in range(7):
        neighbours.append(render(view.get_neighbour(i), render_distance - 1, seen_at))

    return {
        "idx": view.node.idx,
        "orientation": view.orientation,
        "assoc_data": view.node.assoc_data.into_json_struct(),
        "neighbours": neighbours,
    }

async def tiles_around(req):
    if "idx" not in req.query:
        return web.Response(text="no idx", status=400)

    try:
        idx = int(req.query["idx"])
    except ValueError as e:
        return web.Response(text="malformed idx", status=400)

    if "render_distance" not in req.query:
        render_distance = 2
    else:
        try:
            render_distance = int(req.query["render_distance"])
        except ValueError as e:
            return web.Response(text="malformed render_distance", status=400)
        if render_distance > 7:
            return web.Response(text="render distance too large", status=400)

    if "orientation" not in req.query:
        orientation = 0
    else:
        try:
            orientation = int(req.query["orientation"])
        except ValueError as e:
            return web.Response(text="malformed orientation", status=400)
        if orientation > 7:
            return web.Response(text="render distance too large", status=400)

    async with WORLD_LOCK:
        tile = WORLD.get_child_with_idx(idx)
        if tile is None:
            return web.Response(text="no such idx", status=400)
        nodeview = NodeView(tile, orientation)


        seen_at = {}
        render(nodeview, render_distance, seen_at)
        rendered = render(nodeview, render_distance, {a: b - 1 for a, b in seen_at.items()})

        history = tile.assoc_data.detailed()

    return web.Response(text=json.dumps({"rendered": rendered, "history": history}))

async def set_data(req):
    global DIRTY
    if "idx" not in req.query:
        return web.Response(text="no idx", status=400)
    try:
        idx = int(req.query["idx"])
    except ValueError as e:
        return web.Response(text="malformed idx", status=400)

    data = await req.json()
    if "prop" not in data:
        return web.Response(text="no prop", status=400)
    prop = data["prop"]
    if "value" not in data:
        return web.Response(text="no value", status=400)
    value = data["value"]
    if "author" not in data:
        return web.Response(text="no author", status=400)
    author = data["author"].strip()

    if author == "<SERVER>":
        return web.Response(text="invalid", status=400)

    lgval = repr(value) if len(value) < 40 else repr(value[:40]) + "..."
    lg.info(f"{author} ({req.remote}) changing {prop} to {lgval} at {idx}")

    async with WORLD_LOCK:
        tile = WORLD.get_child_with_idx(idx)
        if tile is None:
            return web.Response(text="no such idx", status=400)

        tile.assoc_data.set_field(prop, value, author)
        DIRTY = True

    return web.Response(text="cool")

async def delete_data(req):
    global DIRTY
    if "idx" not in req.query:
        return web.Response(text="no idx", status=400)
    try:
        idx = int(req.query["idx"])
    except ValueError as e:
        return web.Response(text="malformed idx", status=400)

    data = await req.json()
    if "prop" not in data:
        return web.Response(text="no prop", status=400)
    prop = data["prop"]
    if "author" not in data:
        return web.Response(text="no author", status=400)
    author = data["author"].strip()

    if author == "<SERVER>":
        return web.Response(text="invalid", status=400)

    lg.info(f"{author} ({req.remote}) deleting {prop} at {idx}")
    async with WORLD_LOCK:
        tile = WORLD.get_child_with_idx(idx)
        if tile is None:
            return web.Response(text="no such idx", status=400)

        if not tile.assoc_data.delete_field(prop, author):
            lg.warning(f"Already deleted!")
        DIRTY = True

    return web.Response(text="cool")

async def on_shutdown(app):
    lg.info("Writing world...")
    save()
    lg.info("Done!")

async def save_interval():
    global DIRTY
    while True:
        await asyncio.sleep(60 * 30)
        if DIRTY:
            async with WORLD_LOCK:
                save()
            DIRTY = False

async def on_startup(app):
    asyncio.create_task(save_interval())

def save():
    with open(SAVE_FILE, "wb") as f:
        data = pickle.dumps(WORLD)
        f.write(data)
    lg.info(f"Saved {len(data)} bytes.")

if __name__ == "__main__":

    app = web.Application()

    app.add_routes([
        web.get("/hyperbolic-nomic/api/tiles", tiles_around),
        web.post("/hyperbolic-nomic/api/set_data", set_data),
        web.post("/hyperbolic-nomic/api/delete_data", delete_data),
        web.get(
            "/hyperbolic-nomic/index.html",
            lambda _: web.Response(
                text = \
                    open("static/index.html", "r")
                    .read()
                    .replace("TEMPLATE TEXT", " conic nomic 2 heptagonal hyperbolic space map editor thing gamestate keywords "),
                content_type="text/html",
            )
        ),
        web.get(
            "/hyperbolic-nomic/hidden-yes-very-secret.html",
            lambda _: web.Response(
                text = \
                    open("static/index.html", "r")
                    .read()
                    .replace("colors-bright.css", "colors-dark.css")
                    .replace("TEMPLATE TEXT", "welcome to hacker space 😎"),
                content_type="text/html",
            )
        ),
    ])
    app.on_shutdown.append(on_shutdown)
    app.on_startup.append(on_startup)

    web.run_app(app, port=9080, access_log=None)
