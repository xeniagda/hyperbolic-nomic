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

function draw(idx, assoc_data, corners, center) {
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
    if (Object.keys(assoc_data).length > 0) {
        inner.classList.add("has-data");
    } else {
        inner.classList.remove("has-data");
    }
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
    outer.dataset.fade_x = prec(((mini + maxi) * 1.2 + 2) / 4);
    outer.dataset.fade_y = prec(((minr + maxr) * 1.2 + 2) / 4);

    if (is_new) {
        outer.style.width = 0;
        outer.style.height = 0;
        outer.style.left = outer.dataset.fade_x;
        outer.style.top = outer.dataset.fade_y;
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
    let angle_rad = (math.pi * 2 + math.arg(math.sub(math.div(math.add(corners[0], corners[1]), 2), center))) % (2 * math.pi);
    let orientation = angle_rad / (2 * math.pi) * 7;
    inner.innerText += "\n" + (0 | 10 * orientation) / 10;

    outer.onclick = e => {
        CURRENT_IDX = idx;
        ORIENTATION = 0 | (0.5 + orientation);
        run();
    };

    if (is_new) {
        return () => {
            outer.style.left = prec((mini + 1) / 2);
            outer.style.top = prec((minr + 1) / 2);
            outer.style.width = prec((maxi - mini) / 2);
            outer.style.height = prec((maxr - minr) / 2);
            outer.style.opacity = "100%";
        };
    } else {
        return () => {};
    }
}

function render(tile, path) {
    let fns = [];
    let [corners, [center]] = transform_poly_along_path(origin_corners, path, [math.complex(0, 0)]);
    corners = reorient(corners, tile.orientation);
    fns.push(draw(tile.idx, tile.assoc_data, corners, center));
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

EDITING_FIELD = null;

function render_cell_data(data) {
    let cell_data = document.getElementById("cell-data");
    cell_data.innerHTML = "";
    if (Object.keys(a.assoc_data).length > 0) {

        let keys = Object.keys(a.assoc_data);
        keys.sort();
        for (k of keys) {
            let v = a.assoc_data[k];
            let id = encodeURIComponent(k);

            let k_div = document.createElement("div");
            k_div.classList.add("cell-property");
            cell_data.appendChild(k_div);

            let label = document.createElement("label");
            label.element_id = id;
            var lab = document.createElement("p");
            lab.classList.add("prop-name");
            lab.innerText = k;
            label.appendChild(lab);
            k_div.appendChild(label);

            if (EDITING_FIELD === k) {
                let data = document.createElement("textArea");
                data.id = id;
                data.innerText = v;
                label.appendChild(data);

                let auth_lab = document.createElement("label");
                var lab = document.createElement("p");
                lab.classList.add("prop-name");
                lab.innerText = "Author (only for logs)";
                auth_lab.appendChild(lab);
                k_div.appendChild(auth_lab);

                let author_text = document.createElement("input");
                author_text.type = "text";
                author_text.id = "author";
                auth_lab.appendChild(author_text);
                author_text.oninput = () => { document.getElementById("author").classList.remove("danger"); };

                let cancel_button = document.createElement("button");
                cancel_button.innerText = "Cancel";
                k_div.appendChild(cancel_button)
                cancel_button.onclick = async () => {
                    EDITING_FIELD = null;
                    await run();
                };

                let delete_button = document.createElement("button");
                delete_button.innerText = "Delete me.";
                delete_button.classList.add("danger");
                k_div.appendChild(delete_button)
                delete_button.onclick = async () => {
                    let name = document.getElementById("author").value;
                    if (name === "") {
                        document.getElementById("author").classList.add("danger");
                        return;
                    }
                    if (!confirm("Are you sure you want to delete " + k + "?")) {
                        return;
                    }
                    let data = {"prop": k, "author": name};
                    await fetch(`/api/delete_data?idx=${CURRENT_IDX}`, {
                        method: 'POST', // *GET, POST, PUT, DELETE, etc.
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });
                    EDITING_FIELD = null;
                    await run();
                };

                let submit_button = document.createElement("button");
                submit_button.innerText = "Submit";
                k_div.appendChild(submit_button);

                submit_button.onclick = async () => {
                    let name = document.getElementById("author").value;
                    if (name === "") {
                        document.getElementById("author").classList.add("danger");
                        return;
                    }
                    let value = document.getElementById(id).value;
                    let data = {"prop": k, "value": value, "author": name};
                    await fetch(`/api/set_data?idx=${CURRENT_IDX}`, {
                        method: 'POST', // *GET, POST, PUT, DELETE, etc.
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });
                    EDITING_FIELD = null;
                    await run();
                };
            }
            else {
                let edit_button = document.createElement("button");
                edit_button.innerText = "Edit!";
                k_div.appendChild(edit_button)

                edit_button.onclick = () => { EDITING_FIELD = k; render_cell_data(data); };

                let data = document.createElement("p");
                data.id = id;
                data.classList.add("prop-data");
                data.innerText = v;
                label.appendChild(data);
            }
            cell_data.appendChild(document.createElement("hr"));
        }
    }
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
                elem.style.left = elem.dataset.fade_x;
                elem.style.top = elem.dataset.fade_y;
            }
        }
    }
    let fns = render(a, []);
    requestAnimationFrame(() => { for (fn of fns) { fn() } });

    render_cell_data(a.assoc_data);
}
run();
