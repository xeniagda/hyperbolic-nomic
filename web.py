import asyncio, json
from aiohttp import web

from hypertiling import OriginNode, TileGenerationContext, NodeView

WORLD = OriginNode(TileGenerationContext(0))
WRITE_LOCK = asyncio.Lock()

def render(view, render_distance, seen_at=None):
    if seen_at == None:
        seen_at = {}

    if view.node.idx in seen_at and seen_at[view.node.idx] > render_distance:
        return None

    if render_distance == 0:
        return None

    seen_at[view.node.idx] = render_distance

    # if not tile.is_available():
    #     return None

    neighbours = []
    for i in range(7):
        neighbours.append(render(view.get_neighbour(i), render_distance - 1, seen_at))

    return {
        "idx": view.node.idx,
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

    tile = WORLD.get_child_with_idx(idx)
    if tile is None:
        return web.Response(text="no such idx", status=400)

    data = render(NodeView(tile, 0), render_distance)

    return web.Response(text=json.dumps(data))

async def on_shutdown(app):
    print("Writing world...")
    await asyncio.sleep(0.1) # TODO: Save the thing
    print("Done!")

if __name__ == "__main__":

    app = web.Application()

    app.add_routes([
        web.get("/api/tiles", tiles_around),
        web.get("/", lambda req: web.Response(status=301, headers={"Location": "index.html"})),
        web.static("/", "client"),
    ])
    app.on_shutdown.append(on_shutdown)

    web.run_app(app, port=9080)
