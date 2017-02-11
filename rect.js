let nextRect = 0
let nextPoint = 0

const Rect = function(props) {
  Object.assign(this, props)
  const {x,y,w,h} = props
  this.id = ++nextRect
  this.left = x
  this.right = x+w
  this.bottom = y
  this.top = y+h
  this.topLeft = {x, y: this.top}
  this.topRight = {x: this.right, y: this.top}
  this.bottomLeft = {x, y}
  this.bottomRight = {x: this.right, y}
  this.center = {x: this.x+this.w/2, y: this.y+this.h/2}
  this.terminal = true
  this.points = [
    {x: this.left, y: this.bottom, type: 'BL', obstacle: this, id: ++nextPoint},
    {x: this.left, y: this.top, type: 'TL', obstacle: this, id: ++nextPoint},
    {x: this.right, y: this.top, type: 'TR', obstacle: this, id: ++nextPoint},
    {x: this.right, y: this.bottom, type: 'BR', obstacle: this, id: ++nextPoint}
  ]
}

Rect.prototype.serialize = function() {
  const {x,y,w,h} = this
  return {x,y,w,h}
}

Rect.prototype.draw = function(ctx) {
  //ctx.strokeRect(o.x, o.y, o.w, o.h)
  ctx.fillStyle = 'black'
  ctx.fillRect(this.x, this.y, this.w, this.h)
  ctx.font = '20px sans';
  ctx.fillStyle = 'blue'
  this.points.forEach(p => ctx.fillText(p.id, p.x, p.y))
}

Rect.reset = () => {
  nextRect = 0
  nextPoint = 0
}

Rect.fromPoints = (p1, p2) =>
  new Rect({x:p1.x, y:p1.y, w: p2.x-p1.x, h: p2.y-p1.y})

Rect.fromPoints2 = (p1, p2) =>
  new Rect({x: p1.x, y: p2.y, w: p2.x-p1.x, h: p1.y-p2.y})

module.exports = Rect
