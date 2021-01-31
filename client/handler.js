function hexpair(x) {
    let letters = "0123456789abcdef";
    return letters[(x >> 4) & 0xf] + letters[x & 0xf];
}

function rgb2hex(r, g, b) {
    return "#" + hexpair(r) + hexpair(g) + hexpair(b);
}

function comp2prec(z) {
    let x = z.re;
    let y = z.im;
    return [(x + 1) * 50 + "%", (y + 1) * 50 + "%"];
}

function render(tile, path) {
    let idx = tile.idx;
    let id = "tile-" + idx;
    let color = rgb2hex(idx * 191 + 138, idx * 9 + 130, idx * 140 + 107); // Arbitrary "random" combination
    console.log(color);

    let outer = document.createElement("div");
    outer.id = id;
    outer.classList.add("cell-outer");
    outer.style = `width: 100%; height: 100%;`;

    let inner = document.createElement("div");
    inner.classList.add("cell-inner");

    let corners = get_corners_and_center(path);
    let center = corners.splice(-1);

    console.log(corners);
    var clippath = "polygon(";

    for (var i = 0; i < corners.length; i++) {
        let c = corners[i];
        let [x, y] = comp2prec(c);

        clippath += `${x} ${y}`;
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

    for (var i = 0; i < tile.neighbours.length; i++) {
        let ch = tile.neighbours[i];
        if (ch === null) {
            continue;
        }
        let new_path = [...path, i];
        render(ch, new_path);
    }
}

async function run() {
    a = await (await fetch("/api/tiles?idx=0")).json();
    render(a, []);
}
run();
