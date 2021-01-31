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
    invert(z) {
        let v = math.sub(z, this.origin);
        let v_ = invert_point(v, this.radius);
        let z_ = math.add(v_, this.origin);
        return z_;
    }
}

class Line {
    constructor(point_on_unit_circle) {
        this.pouc = point_on_unit_circle;
        if (this.pouc.im < 0) {
            this.pouc = math.multiply(this.pouc, -1);
        }
    }
    invert(z) {
        return math.mul(this.pouc, math.div(z, this.pouc).conjugate());
    }
}

// p and q are points inside the circle. this finds a hyperbolic line, a circle normalling the unit
// circle twice. May return a Line
function find_ext_circle(p, q) {
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

var origin_corners = [];
for (var i = 0; i < p; i++) {
    let angle = (-i + 0.5) / p * math.pi * 2 - math.pi / 2;
    let unit_point = math.complex(math.cos(angle), math.sin(angle));
    let circle_center_point = math.mul(unit_point, corner_dist);

    origin_corners.push(circle_center_point);
}


// poly[0] and poly[1] are side 0
function transform_poly_along_side(poly, side, extra_points) {
    let c0 = poly[side];
    let c1 = poly[(side + 1) % poly.length];
    let inverter = find_ext_circle(c0, c1);

    let new_poly = [];
    for (var i = 0; i < poly.length; i++) {
        // i = 0 gives point side+1
        // i = 1 gives point side
        var idx = side + 1 - i;

        idx %= poly.length;
        idx += poly.length; // aaaaaaaa
        idx %= poly.length;

        new_poly.push(inverter.invert(poly[idx]));
    }
    let new_extra_points = [];
    for (var i = 0; i < extra_points.length; i++) {
        // i = 0 gives point side+1
        // i = 1 gives point side
        var idx = side + 1 - i;

        idx %= extra_points.length;
        idx += extra_points.length; // aaaaaaaa
        idx %= extra_points.length;

        new_extra_points.push(inverter.invert(extra_points[idx]));
    }
    return [new_poly, new_extra_points];
}

function transform_poly_along_path(poly, path, extra_points) {
    for (side of path) {
        [poly, extra_points] = transform_poly_along_side(poly, side, extra_points);
    }
    return [poly, extra_points];
}
