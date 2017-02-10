const Delaunay = require('delaunay-fast')
const astar = require('a-star')
const Rect = require('./rect.js')
const Triangle = require('./triangle.js')

const u = {
    randomInt: (min, max) => Math.floor(Math.random() * (max - min)) + min,
    flatMap: (arr, cb) => Array.prototype.concat.apply([], arr.map(cb)),
    arrow: (ctx) => (from, to) => {
      var headlen = 10;
      var angle = Math.atan2(to.y-from.y,to.x-from.x);
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.lineTo(to.x-headlen*Math.cos(angle-Math.PI/12),to.y-headlen*Math.sin(angle-Math.PI/12));
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x-headlen*Math.cos(angle+Math.PI/12),to.y-headlen*Math.sin(angle+Math.PI/12));
  },
  d: (p1, p2) => Math.sqrt((p1.x - p2.x)*(p1.x - p2.x) + (p1.y - p2.y)*(p1.y - p2.y)),
  mid: (p1, p2) => ({x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2})
}

const Demo = {
  maxX: 1024, maxY: 768,
  obstacles: [], navmesh: [],

  draw: function() {
    const canvas = document.getElementById('main')
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    this.obstacles.forEach(o => o.draw(ctx))

    ctx.fillStyle = 'rgba(255, 0, 0, .5)'
    ctx.font = '8px Sans'
    const arrow = u.arrow(ctx)
    this.navmesh
    //.filter(t => !t.blocked())
    .forEach(t => {
      t.draw(ctx)
      if(t.blocked()) return
      ctx.strokeStyle = 'green'
      ctx.beginPath()
      t.adjacent().filter(adj => !adj.blocked()).forEach(adj => {
        const r = t.passableRadius(adj)
        const from = t.center, to = adj.center
        arrow(from, to)
        ctx.fillStyle = 'green'
        ctx.fillText(Math.floor(r), from.x + (to.x - from.x)/4, from.y + (to.y - from.y)/4)
      })
      ctx.stroke()
    })
  },

  buildNavmesh: function() {
    Triangle.reset()
    //Rect.reset()

    const points = u.flatMap(this.obstacles, o => o.points.map(p => {p.point = [p.x, p.y]; return p}))
    const indices = Delaunay.triangulate(points, 'point')
    const mesh = []
    indices.forEach((p, i) => {
      if((i+1) % 3 == 0 && i > 0) {
        const a = points[indices[i-2]], b = points[indices[i-1]], c = points[indices[i]]
        mesh.push(new Triangle({a, b, c}))
      }
    })
    return mesh
  },

  start: function() {
//    this.generateObstacles()
   this.buildNavmesh()
    const canvas = document.getElementById('main')
    canvas.addEventListener('click', (ev) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
        const w = u.randomInt(this.maxX/32, this.maxX/4), h = u.randomInt(this.maxY/32, this.maxY/4)
        this.obstacles.push(new Rect({w, h, x: x - w/2, y: y - h/2}))
        this.navmesh = this.buildNavmesh()
        this.draw()
    })
    this.draw()
  },
}

window.onload = () => Demo.start()

window.path = function(fromId, toId, radius = 0) {
  const from = Triangle.all()[fromId], to = Triangle.all()[toId]
  const ret = astar({
    start: from,
    isEnd: n => n == to,
    neighbor: n => n.adjacent().filter(t => t.passableRadius(n) > radius),
    distance: (a, b) => u.d(a.center, b.center),
    heuristic: (n) => u.d(n.center, to.center),
    hash: n => ""+n.id
  })

  if(ret.status == "success") {
    Demo.draw()
    const canvas = document.getElementById('main')
    const ctx = canvas.getContext('2d')
    const arrow = u.arrow(ctx)
    let prev = null
    const edges = ret.path.reduce((acc, current) => {
      const ret = prev ? [...acc, prev.adjSide(current)] : acc
      prev = current
      return ret
    }, [])

    ctx.strokeStyle = 'black'
    ctx.lineWidth = 2
    ctx.beginPath()
    edges.reduce((e1, e2) => {
      if(e1 && e2) {
        a = u.mid(e1[0], e1[1])
        b = u.mid(e2[0], e2[1])
        arrow(a, b)
        console.log(`(${e1[0].id}, ${e1[1].id}) -> (${e2[0].id}, ${e2[1].id})`)
      }
      return e2
    })
    ctx.stroke()
    ctx.lineWidth = 1
  }
  return ret
}
