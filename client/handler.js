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

SPACING = 0.05;

function draw(idx, corners, center) {
    let id = "tile-" + idx;
    let color = rgb2hex(idx * 191 + 138, idx * 9 + 130, idx * 140 + 107); // Arbitrary "random" combination
    console.log(color);

    let outer = document.createElement("div");
    outer.id = id;
    outer.classList.add("cell-outer");
    outer.style = `width: 100%; height: 100%;`;

    let inner = document.createElement("div");
    inner.classList.add("cell-inner");

    console.log(corners);

    var minr = 1, maxr = -1, mini = 1, maxi = -1;
    for (co of corners) {
        minr = Math.min(minr, co.re);
        maxr = Math.max(maxr, co.re);
        mini = Math.min(mini, co.im);
        maxi = Math.max(maxi, co.im);
    }
    outer.style.left = prec((minr + 1) / 2);
    outer.style.top = prec((mini + 1) / 2);
    outer.style.width = prec((maxr - minr) / 2);
    outer.style.height = prec((maxi - mini) / 2);

    var clippath = "polygon(";
    for (var i = 0; i < corners.length; i++) {
        let c = corners[i];
        c = math.add(math.mul(c, 1 - SPACING), math.mul(center, SPACING))
        let x = (c.re - minr) / (maxr - minr);
        let y = (c.im - mini) / (maxi - mini);

        clippath += `${prec(x)} ${prec(y)}`;
        if (i !== corners.length - 1) {
            clippath += ",";
        }
    }
    clippath += ");"
    console.log(clippath);

    inner.setAttribute("style", "clip-path: " + clippath);
    inner.style.background = color;

    outer.appendChild(inner);

    document.getElementById("container").appendChild(outer);
}

function render(tile, path) {
    let [corners, [center]] = transform_poly_along_path(origin_corners, path, [math.complex(0, 0)]);
    draw(tile.idx, corners, center);
    for (var i = 0; i < tile.neighbours.length; i++) {
        if (tile.neighbours[i] !== null) {
            let new_path = [...path, i];
            render(tile.neighbours[i], new_path);
        }
    }
}

async function run() {
    a = await (await fetch("/api/tiles?idx=0&render_distance=4")).json();
    render(a, []);
}
run();
