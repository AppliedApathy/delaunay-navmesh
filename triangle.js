const _ = require('lodash')

const visibleFrom = (p1, p2) => {
  // const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x)
  // while(angle < 0)
  //   angle += 2 * Math.PI
  let v = true, h = true
  if(p1.type[0] == 'T' && p1.y > p2.y) v = false
  if(p1.type[0] == 'B' && p1.y < p2.y) v = false
  if(p1.type[1] == 'L' && p1.x < p2.x) h = false
  if(p1.type[1] == 'R' && p1.x > p2.x) h = false
  return v || h
}

const d = (p1, p2) => Math.sqrt((p1.x - p2.x)*(p1.x - p2.x) + (p1.y - p2.y)*(p1.y - p2.y))

let nextTringle = 0
let triangles = {}

function Triangle(points) {
  this.id = ++nextTriangle
  triangles[this.id] = this

  //console.log(this.id, new Error())
  Object.keys(points).forEach(k => {
    const p = points[k]
    this[k] = p
    p.triangles = [...(p.triangles || []), this]
    this.points = [...(this.points || []), p]
  })

  const {a, b, c} = this
  this.center = {x: (a.x + b.x + c.x)/3, y: (a.y + b.y + c.y)/3}
}

Triangle.reset = () => {
  nextTriangle = 0
  Object.values(triangles).forEach(t => t.points.forEach(p => p.triangles = []))
  triangles = {}
}

Triangle.all = () => triangles

Triangle.prototype.needsFix = function() {
  const {a, b, c} = this
  if(a.obstacle == b.obstacle && b.obstacle == c.obstacle) return false
  return !(visibleFrom(a, b) && visibleFrom(b, c) && visibleFrom(c, a) &&
  visibleFrom(b, a) && visibleFrom(c, b) && visibleFrom(a, c))
}

Triangle.prototype.destroy = function() {
  triangles[this.id] = undefined
  delete triangles[this.id]
  this.points.forEach(p => p.triangles = p.triangles.filter(t => t != this))
  console.log('destroy', this.id, triangles)
}

Triangle.prototype.sides = function() {
  if(!this._sides) {
      const {a, b, c} = this
      this._sides = [[a, b], [b, c], [c, a]]
  }
  return this._sides
}

Triangle.prototype.obstacles = function() {
    if(!this._obstacles) {
      const {a, b, c} = this
      this._obstacles = [a.obstacle, b.obstacle, c.obstacle]
    }
    return this._obstacles
}

Triangle.prototype.obstacleIntersections = function() {
  const points = {}
  const ret = this.obstacles().map(o => o.sides().map(os => this.sides().map(ts => lineIntersection(os, ts)).filter(p => p != null)))
  return _.flatten(_.flatten(ret))
}

Triangle.prototype.draw = function(ctx) {
  const {a, b, c} = this
  const needsFix = this.needsFix()
  ctx.strokeStyle = needsFix ? 'red' : 'blue'
  ctx.fillStyle = needsFix ? 'rgba(255, 0, 0, .3)' : 'rgba(0, 0, 255, 1)'
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.lineTo(c.x, c.y)
  ctx.stroke()
  ctx.fillText(this.id, this.center.x, this.center.y)
  //ctx.fill()
}

Triangle.prototype.adjacent = function() {
  const {a, b, c} = this
  //adjacent if has two common points
  const common = (point, others) => point.triangles
      .filter(t => t != this)
      .filter(t => others.find(p => p.triangles.includes(t)))
  return _.uniq([...common(a, [b, c]), ...common(b, [a, c]), ...common(c, [a, b])])
}

Triangle.prototype.blocked = function() {
  const {a, b, c} = this
  return a.obstacle == b.obstacle && b.obstacle == c.obstacle || this.needsFix()
}

Triangle.prototype.adjSide = function(other) {
   return _.intersection(this.points, other.points)
}

Triangle.prototype.toString = function() {
    const {id, a, b, c} = this
    return `${id} (${a.id}, ${b.id}, ${c.id})`
}

Triangle.prototype.passableRadius = function(other) {
  const {a, b, c} = this
  const points = [a, b, c]

  //all vertices are on the same obstacle. Not passable
  if(a.obstacle == b.obstacle && b.obstacle == c.obstacle)
    return 0

  //each vertex on different obstacle. Pass radius = side
  if(a.obstacle != b.obstacle && b.obstacle != c.obstacle) {
    const c = this.adjSide(other)
    return d(c[0], c[1])
  }

  //two vertices are on the same side. Pass radius = altitude to base of blocked side
  let b1 = null, b2 = null, h = null
  if(a.obstacle == b.obstacle)
    b1 = a, b2 = b, h = c
  if(b.obstacle == c.obstacle)
    b1 = b, b2 = c, h = a
  if(c.obstacle == a.obstacle)[]
    b1 = c, b2 = a, h = b

  return d(h, getSpPoint(b1, b2, h))
}

//http://stackoverflow.com/a/12499474[]
function getSpPoint(A,B,C) {
    var x1=A.x, y1=A.y, x2=B.x, y2=B.y, x3=C.x, y3=C.y;
    var px = x2-x1, py = y2-y1, dAB = px*px + py*py;
    var u = ((x3 - x1) * px + (y3 - y1) * py) / dAB;
    var x = x1 + u * px, y = y1 + u * py;
    return {x:x, y:y};
}

function lineIntersection(l1, l2) {
  const ret = checkLineIntersection(l1[0].x, l1[0].y, l1[1].x, l1[1].y, l2[0].x, l2[0].y, l2[1].x, l2[1].y)
  console.log(l1, l2, ret)
  return (ret.onLine1 && ret.onLine2) ? ret : null
}

//http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
function checkLineIntersection(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
  console.log(arguments)
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator == 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
/*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
};

module.exports = Triangle
