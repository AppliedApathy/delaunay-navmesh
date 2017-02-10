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
  return !(visibleFrom(a, b) && visibleFrom(b, c) && visibleFrom(c, a) &&
  visibleFrom(b, a) && visibleFrom(c, b) && visibleFrom(a, c))
}

Triangle.prototype.draw = function(ctx) {
  const {a, b, c} = this
  ctx.strokeStyle = this.needsFix() ? 'red' : 'blue'
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.lineTo(c.x, c.y)
  ctx.stroke()
  ctx.fillStyle = ctx.strokeStyle
  ctx.fillText(this.id, this.center.x, this.center.y)
  if(this.needsFix()) {
    ctx.fillStyle = 'rgba(255, 0, 0, .3)'
    ctx.fill();
  }
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
  if(c.obstacle == a.obstacle)
    b1 = c, b2 = a, h = b

  return d(h, getSpPoint(b1, b2, h))
}

//http://stackoverflow.com/a/12499474
function getSpPoint(A,B,C) {
    var x1=A.x, y1=A.y, x2=B.x, y2=B.y, x3=C.x, y3=C.y;
    var px = x2-x1, py = y2-y1, dAB = px*px + py*py;
    var u = ((x3 - x1) * px + (y3 - y1) * py) / dAB;
    var x = x1 + u * px, y = y1 + u * py;
    return {x:x, y:y};
}

module.exports = Triangle
