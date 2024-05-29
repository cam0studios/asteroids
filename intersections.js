window.linePointCollision = function (l1, l2, p) {
    let d1 = p5.Vector.sub(l1, p).mag();
    let d2 = p5.Vector.sub(l2, p).mag();
    let l = p5.Vector.sub(l2, l1).mag();
    return d1 + d2 > l - 0.1 && d1 + d2 < l + 0.1;
}
window.lineClosestPoint = function (l1, l2, p) {
    let dif = p5.Vector.sub(l2, l1);
    let dot = p5.Vector.dot(p5.Vector.sub(p, l1), p5.Vector.sub(l2, l1)) / dif.magSq();
    return p5.Vector.add(l1, p5.Vector.mult(dif, dot));
}
window.lineCircleCollision = function (l1, l2, c, r) {
    if (p5.Vector.sub(l1, c).mag() < r || p5.Vector.sub(l2, c).mag() < r) return true;
    let closest = lineClosestPoint(l1, l2, c);
    if (!linePointCollision(l1, l2, closest)) return false;
    return p5.Vector.sub(closest, c).mag() < r;
}