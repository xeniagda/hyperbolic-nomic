function hexpair(x) {
    let letters = "0123456789abcdef";
    return letters[(x >> 4) & 0xf] + letters[x & 0xf];
}

function rgb2hex(r, g, b) {
    return "#" + hexpair(r) + hexpair(g) + hexpair(b);
}

function prec(x) {
    return x * 100 + "%";
}

SPACING = 0.015;

CURRENT_IDX = 0;
ORIENTATION = 0;

function draw(idx, corners, center) {
    let id = "tile-" + idx;

    var is_new;
    var outer;
    if (document.getElementById(id) === null) {
        outer = document.createElement("div");
        document.getElementById("container").appendChild(outer);
        is_new = true;
    } else {
        outer = document.getElementById(id);
        is_new = false;
    }
    outer.id = id;
    outer.dataset.idx = idx;
    outer.classList.add("cell-outer");
    outer.style = `width: 100%; height: 100%;`;

    var inner;
    if (document.getElementById(id + "-inner") === null) {
        inner = document.createElement("div");
        outer.appendChild(inner);
        inner.id = id + "-inner";
    } else {
        inner = document.getElementById(id + "-inner");
    }
    inner.innerText = idx;

    inner.classList.add("cell-inner");
    if (CURRENT_IDX == idx) {
        outer.classList.add("active");
    } else {
        outer.classList.remove("active");
    }

    var minr = 1, maxr = -1, mini = 1, maxi = -1;
    for (co of corners) {
        minr = Math.min(minr, -co.re);
        maxr = Math.max(maxr, -co.re);
        mini = Math.min(mini, co.im);
        maxi = Math.max(maxi, co.im);
    }
    if (is_new) {
        outer.style.width = 0;
        outer.style.height = 0;
    } else {
        outer.style.left = prec((mini + 1) / 2);
        outer.style.top = prec((minr + 1) / 2);
        outer.style.width = prec((maxi - mini) / 2);
        outer.style.height = prec((maxr - minr) / 2);
    }

    var clippath = "polygon(";
    for (var i = 0; i < corners.length; i++) {
        let c = corners[i];
        respacing = SPACING / (maxr - minr);
        c = math.add(math.mul(c, 1 - respacing), math.mul(center, respacing))
        let x = (c.im - mini) / (maxi - mini);
        let y = (-c.re - minr) / (maxr - minr);

        clippath += `${prec(x)} ${prec(y)}`;
        if (i !== corners.length - 1) {
            clippath += ",";
        }
    }
    clippath += ");"

    inner.setAttribute("style", "clip-path: " + clippath);

    // What way is the thing facing?
    // console.log(corners, center);
    let angle_rad = (math.pi * 2 + math.arg(math.sub(math.div(math.add(corners[0], corners[1]), 2), center))) % (2 * math.pi);
    let orientation = angle_rad / (2 * math.pi) * 7;
    // console.log(angle_c1);
    inner.innerText += "\n" + (0 | 10 * orientation) / 10;

    outer.onclick = e => {
        CURRENT_IDX = idx;
        ORIENTATION = 0 | orientation;
        run();
    };

    if (is_new) {
        return () => {
            outer.style.left = prec((mini + 1) / 2);
            outer.style.top = prec((minr + 1) / 2);
            outer.style.width = prec((maxi - mini) / 2);
            outer.style.height = prec((maxr - minr) / 2);
        };
    } else {
        return () => {};
    }
}

function render(tile, path) {
    let fns = [];
    let [corners, [center]] = transform_poly_along_path(origin_corners, path, [math.complex(0, 0)]);
    fns.push(draw(tile.idx, corners, center));
    for (var i = 0; i < tile.neighbours.length; i++) {
        if (tile.neighbours[i] !== null) {
            let new_path = [...path, i];
            fns.push(...render(tile.neighbours[i], new_path));
        }
    }
    return fns;
}

function get_all_ids(tile) {
    let ids = [tile.idx];
    for (var i = 0; i < tile.neighbours.length; i++) {
        if (tile.neighbours[i] !== null) {
            ids.push(...get_all_ids(tile.neighbours[i]));
        }
    }
    return ids;
}

async function run() {
    a = await (await fetch(`/api/tiles?idx=${CURRENT_IDX}&orientation=${ORIENTATION}&render_distance=3`)).json();

    let to_render = get_all_ids(a);
    for (elem of Array.from(document.getElementsByClassName("cell-outer"))) {
        let idx = 0 | elem.dataset.idx;
        if (!to_render.includes(idx)) {
            if (elem.style.width == "0px") {
                elem.parentNode.removeChild(elem)
            } else {
                elem.style.width = 0;
                elem.style.height = 0;

            }
        }
    }
    let fns = render(a, []);
    requestAnimationFrame(() => { for (fn of fns) { fn() } });
}
run();
