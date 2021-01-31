math.sub = math.subtract;
math.mul = math.multiply;
math.div = math.divide;

function invert_point(z, rad=1) {
    return math.div(z, math.pow(math.abs(z) / rad, 2));
}

class Circle {
    constructor(origin, radius) {
        this.origin = origin;
        this.radius = radius;
    }
}

class Line {
    constructor(point_on_unit_circle) {
        this.pouc = point_on_unit_circle;
        if (this.pouc.im < 0) {
            this.pouc = math.multiply(this.pouc, -1);
        }
    }
}

// p and q are points inside the circle. this finds a hyperbolic line, a circle normalling the unit
// circle twice. May return a Line
function find_circle(p, q) {
    let m = math.div(math.add(p, invert_point(p)), 2);
    let n = math.div(math.add(q, invert_point(q)), 2);

    let a = p.re; let b = p.im;
    let c = q.re; let d = q.im;
    let h = math.multiply(math.complex(0, 1), math.sub(n, m));
    let x = h.re; let y = h.im;

    if (Math.abs(b * c  - a * d) < 1e-5) {
        // Special case for line
        if (math.abs(math.div(p, q).im) > 1e-5) {
            console.log("math broke");
        }
        return new Line(math.div(p, math.abs(p)));
    }

    let t1 = (y * c - x * d) / (b * c - a * d);
    let t2 = (b * x - a * y) / (b * c - a * d);

    let o1 = math.add(m, math.multiply(t1, p, math.complex(0, -1)));
    let o2 = math.add(n, math.multiply(t2, q, math.complex(0, 1)));
    if (math.abs(math.sub(o1, o2)) > 1e-5) {
        console.log("math broke");
    }

    let r1 = math.abs(math.sub(o1, p));
    let r2 = math.abs(math.sub(o2, q));

    if (math.abs(math.sub(o1, o2)) > 1e-5) {
        console.log("math broke");
    }

    return new Circle(o1, r1);
}

// Note: changing these makes the server<-->client communication kinda break
const p = 7;
const q = 3;

let corner_dist = math.pow(
    (math.tan(math.pi / 2 - math.pi / q) - math.tan(math.pi / p)) /
    (math.tan(math.pi / 2 - math.pi / q) + math.tan(math.pi / p)),
    0.5
);

let alpha = math.pi / p;
let side_circle_origin_dist = (corner_dist + 1 / corner_dist) / (2 * math.cos(alpha));
let side_circle_radius_sq = corner_dist ** 2 * (1 - math.cos(alpha) ** 2) + (side_circle_origin_dist - corner_dist * math.cos(alpha)) ** 2;
let side_circle_radius = side_circle_radius_sq ** 0.5;

function get_corners_and_center(path) {
    if (path.length == 0) {
        var points = [];
        for (var i = 0; i < p; i++) {
            let angle = (i + 0.5) / p * math.pi * 2;
            let unit_point = math.complex(math.cos(angle), math.sin(angle));
            let circle_center_point = math.mul(unit_point, corner_dist);

            points.push(circle_center_point);
        }
        points.push(math.complex(0, 0));
        return points;
    }

    var path = [...path];
    let last_transform = path.splice(-1);
    let angle = last_transform / p * math.pi * 2;
    let unit_point = math.complex(math.cos(angle), math.sin(angle));
    let circle_center_point = math.mul(unit_point, side_circle_origin_dist);

    var points = get_corners_and_center(path);
    for (var i = 0; i < points.length; i++) {
        let pi = points[i];
        let z = math.sub(circle_center_point, pi);
        let z_ = invert_point(z, side_circle_radius);
        let pi_ = math.sub(circle_center_point, z_);

        points[i] = pi_;
    }
    return points;
}
