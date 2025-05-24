import{g as ye}from"./config-978035c8.js";import{n as Z}from"./getColorTheme-c9f6ea4d.js";function me(t,e){for(var a=0;a<e.length;a++){const s=e[a];if(typeof s!="string"&&!Array.isArray(s)){for(const d in s)if(d!=="default"&&!(d in t)){const u=Object.getOwnPropertyDescriptor(s,d);u&&Object.defineProperty(t,d,u.get?u:{enumerable:!0,get:()=>s[d]})}}}return Object.freeze(Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}))}var R={exports:{}},T={exports:{}},ee=function(e){return e===0?"x":e===1?"y":e===2?"z":"c"+(e+1)};const be=ee;var P=function(e){return a;function a(s,d){let u=d&&d.indent||0,l=d&&d.join!==void 0?d.join:`
`,v=Array(u+1).join(" "),r=[];for(let f=0;f<e;++f){let c=be(f),b=f===0?"":v;r.push(b+s.replace(/{var}/g,c))}return r.join(l)}};const te=P;T.exports=xe;T.exports.generateCreateBodyFunctionBody=ne;T.exports.getVectorCode=oe;T.exports.getBodyCode=re;function xe(t,e){let a=ne(t,e),{Body:s}=new Function(a)();return s}function ne(t,e){return`
${oe(t,e)}
${re(t)}
return {Body: Body, Vector: Vector};
`}function re(t){let e=te(t),a=e("{var}",{join:", "});return`
function Body(${a}) {
  this.isPinned = false;
  this.pos = new Vector(${a});
  this.force = new Vector();
  this.velocity = new Vector();
  this.mass = 1;

  this.springCount = 0;
  this.springLength = 0;
}

Body.prototype.reset = function() {
  this.force.reset();
  this.springCount = 0;
  this.springLength = 0;
}

Body.prototype.setPosition = function (${a}) {
  ${e("this.pos.{var} = {var} || 0;",{indent:2})}
};`}function oe(t,e){let a=te(t),s="";return e&&(s=`${a(`
   var v{var};
Object.defineProperty(this, '{var}', {
  set: function(v) { 
    if (!Number.isFinite(v)) throw new Error('Cannot set non-numbers to {var}');
    v{var} = v; 
  },
  get: function() { return v{var}; }
});`)}`),`function Vector(${a("{var}",{join:", "})}) {
  ${s}
    if (typeof arguments[0] === 'object') {
      // could be another vector
      let v = arguments[0];
      ${a('if (!Number.isFinite(v.{var})) throw new Error("Expected value is not a finite number at Vector constructor ({var})");',{indent:4})}
      ${a("this.{var} = v.{var};",{indent:4})}
    } else {
      ${a('this.{var} = typeof {var} === "number" ? {var} : 0;',{indent:4})}
    }
  }
  
  Vector.prototype.reset = function () {
    ${a("this.{var} = ",{join:""})}0;
  };`}var we=T.exports,C={exports:{}};const W=P,$=ee;C.exports=Be;C.exports.generateQuadTreeFunctionBody=ie;C.exports.getInsertStackCode=fe;C.exports.getQuadNodeCode=ue;C.exports.isSamePosition=ae;C.exports.getChildBodyCode=se;C.exports.setChildBodyCode=de;function Be(t){let e=ie(t);return new Function(e)()}function ie(t){let e=W(t),a=Math.pow(2,t);return`
${fe()}
${ue(t)}
${ae(t)}
${se(t)}
${de(t)}

function createQuadTree(options, random) {
  options = options || {};
  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

  var gravity = options.gravity;
  var updateQueue = [];
  var insertStack = new InsertStack();
  var theta = options.theta;

  var nodesCache = [];
  var currentInCache = 0;
  var root = newNode();

  return {
    insertBodies: insertBodies,

    /**
     * Gets root node if it is present
     */
    getRoot: function() {
      return root;
    },

    updateBodyForce: update,

    options: function(newOptions) {
      if (newOptions) {
        if (typeof newOptions.gravity === 'number') {
          gravity = newOptions.gravity;
        }
        if (typeof newOptions.theta === 'number') {
          theta = newOptions.theta;
        }

        return this;
      }

      return {
        gravity: gravity,
        theta: theta
      };
    }
  };

  function newNode() {
    // To avoid pressure on GC we reuse nodes.
    var node = nodesCache[currentInCache];
    if (node) {
${l("      node.")}
      node.body = null;
      node.mass = ${e("node.mass_{var} = ",{join:""})}0;
      ${e("node.min_{var} = node.max_{var} = ",{join:""})}0;
    } else {
      node = new QuadNode();
      nodesCache[currentInCache] = node;
    }

    ++currentInCache;
    return node;
  }

  function update(sourceBody) {
    var queue = updateQueue;
    var v;
    ${e("var d{var};",{indent:4})}
    var r; 
    ${e("var f{var} = 0;",{indent:4})}
    var queueLength = 1;
    var shiftIdx = 0;
    var pushIdx = 1;

    queue[0] = root;

    while (queueLength) {
      var node = queue[shiftIdx];
      var body = node.body;

      queueLength -= 1;
      shiftIdx += 1;
      var differentBody = (body !== sourceBody);
      if (body && differentBody) {
        // If the current node is a leaf node (and it is not source body),
        // calculate the force exerted by the current node on body, and add this
        // amount to body's net force.
        ${e("d{var} = body.pos.{var} - sourceBody.pos.{var};",{indent:8})}
        r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});

        if (r === 0) {
          // Poor man's protection against zero distance.
          ${e("d{var} = (random.nextDouble() - 0.5) / 50;",{indent:10})}
          r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});
        }

        // This is standard gravitation force calculation but we divide
        // by r^3 to save two operations when normalizing force vector.
        v = gravity * body.mass * sourceBody.mass / (r * r * r);
        ${e("f{var} += v * d{var};",{indent:8})}
      } else if (differentBody) {
        // Otherwise, calculate the ratio s / r,  where s is the width of the region
        // represented by the internal node, and r is the distance between the body
        // and the node's center-of-mass
        ${e("d{var} = node.mass_{var} / node.mass - sourceBody.pos.{var};",{indent:8})}
        r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});

        if (r === 0) {
          // Sorry about code duplication. I don't want to create many functions
          // right away. Just want to see performance first.
          ${e("d{var} = (random.nextDouble() - 0.5) / 50;",{indent:10})}
          r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});
        }
        // If s / r < θ, treat this internal node as a single body, and calculate the
        // force it exerts on sourceBody, and add this amount to sourceBody's net force.
        if ((node.max_${$(0)} - node.min_${$(0)}) / r < theta) {
          // in the if statement above we consider node's width only
          // because the region was made into square during tree creation.
          // Thus there is no difference between using width or height.
          v = gravity * node.mass * sourceBody.mass / (r * r * r);
          ${e("f{var} += v * d{var};",{indent:10})}
        } else {
          // Otherwise, run the procedure recursively on each of the current node's children.

          // I intentionally unfolded this loop, to save several CPU cycles.
${u()}
        }
      }
    }

    ${e("sourceBody.force.{var} += f{var};",{indent:4})}
  }

  function insertBodies(bodies) {
    ${e("var {var}min = Number.MAX_VALUE;",{indent:4})}
    ${e("var {var}max = Number.MIN_VALUE;",{indent:4})}
    var i = bodies.length;

    // To reduce quad tree depth we are looking for exact bounding box of all particles.
    while (i--) {
      var pos = bodies[i].pos;
      ${e("if (pos.{var} < {var}min) {var}min = pos.{var};",{indent:6})}
      ${e("if (pos.{var} > {var}max) {var}max = pos.{var};",{indent:6})}
    }

    // Makes the bounds square.
    var maxSideLength = -Infinity;
    ${e("if ({var}max - {var}min > maxSideLength) maxSideLength = {var}max - {var}min ;",{indent:4})}

    currentInCache = 0;
    root = newNode();
    ${e("root.min_{var} = {var}min;",{indent:4})}
    ${e("root.max_{var} = {var}min + maxSideLength;",{indent:4})}

    i = bodies.length - 1;
    if (i >= 0) {
      root.body = bodies[i];
    }
    while (i--) {
      insert(bodies[i], root);
    }
  }

  function insert(newBody) {
    insertStack.reset();
    insertStack.push(root, newBody);

    while (!insertStack.isEmpty()) {
      var stackItem = insertStack.pop();
      var node = stackItem.node;
      var body = stackItem.body;

      if (!node.body) {
        // This is internal node. Update the total mass of the node and center-of-mass.
        ${e("var {var} = body.pos.{var};",{indent:8})}
        node.mass += body.mass;
        ${e("node.mass_{var} += body.mass * {var};",{indent:8})}

        // Recursively insert the body in the appropriate quadrant.
        // But first find the appropriate quadrant.
        var quadIdx = 0; // Assume we are in the 0's quad.
        ${e("var min_{var} = node.min_{var};",{indent:8})}
        ${e("var max_{var} = (min_{var} + node.max_{var}) / 2;",{indent:8})}

${d(8)}

        var child = getChild(node, quadIdx);

        if (!child) {
          // The node is internal but this quadrant is not taken. Add
          // subnode to it.
          child = newNode();
          ${e("child.min_{var} = min_{var};",{indent:10})}
          ${e("child.max_{var} = max_{var};",{indent:10})}
          child.body = body;

          setChild(node, quadIdx, child);
        } else {
          // continue searching in this quadrant.
          insertStack.push(child, body);
        }
      } else {
        // We are trying to add to the leaf node.
        // We have to convert current leaf into internal node
        // and continue adding two nodes.
        var oldBody = node.body;
        node.body = null; // internal nodes do not cary bodies

        if (isSamePosition(oldBody.pos, body.pos)) {
          // Prevent infinite subdivision by bumping one node
          // anywhere in this quadrant
          var retriesCount = 3;
          do {
            var offset = random.nextDouble();
            ${e("var d{var} = (node.max_{var} - node.min_{var}) * offset;",{indent:12})}

            ${e("oldBody.pos.{var} = node.min_{var} + d{var};",{indent:12})}
            retriesCount -= 1;
            // Make sure we don't bump it out of the box. If we do, next iteration should fix it
          } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));

          if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
            // This is very bad, we ran out of precision.
            // if we do not return from the method we'll get into
            // infinite loop here. So we sacrifice correctness of layout, and keep the app running
            // Next layout iteration should get larger bounding box in the first step and fix this
            return;
          }
        }
        // Next iteration should subdivide node further.
        insertStack.push(node, oldBody);
        insertStack.push(node, body);
      }
    }
  }
}
return createQuadTree;

`;function d(v){let r=[],f=Array(v+1).join(" ");for(let c=0;c<t;++c)r.push(f+`if (${$(c)} > max_${$(c)}) {`),r.push(f+`  quadIdx = quadIdx + ${Math.pow(2,c)};`),r.push(f+`  min_${$(c)} = max_${$(c)};`),r.push(f+`  max_${$(c)} = node.max_${$(c)};`),r.push(f+"}");return r.join(`
`)}function u(){let v=Array(11).join(" "),r=[];for(let f=0;f<a;++f)r.push(v+`if (node.quad${f}) {`),r.push(v+`  queue[pushIdx] = node.quad${f};`),r.push(v+"  queueLength += 1;"),r.push(v+"  pushIdx += 1;"),r.push(v+"}");return r.join(`
`)}function l(v){let r=[];for(let f=0;f<a;++f)r.push(`${v}quad${f} = null;`);return r.join(`
`)}}function ae(t){let e=W(t);return`
  function isSamePosition(point1, point2) {
    ${e("var d{var} = Math.abs(point1.{var} - point2.{var});",{indent:2})}
  
    return ${e("d{var} < 1e-8",{join:" && "})};
  }  
`}function de(t){var e=Math.pow(2,t);return`
function setChild(node, idx, child) {
  ${a()}
}`;function a(){let s=[];for(let d=0;d<e;++d){let u=d===0?"  ":"  else ";s.push(`${u}if (idx === ${d}) node.quad${d} = child;`)}return s.join(`
`)}}function se(t){return`function getChild(node, idx) {
${e()}
  return null;
}`;function e(){let a=[],s=Math.pow(2,t);for(let d=0;d<s;++d)a.push(`  if (idx === ${d}) return node.quad${d};`);return a.join(`
`)}}function ue(t){let e=W(t),a=Math.pow(2,t);var s=`
function QuadNode() {
  // body stored inside this node. In quad tree only leaf nodes (by construction)
  // contain bodies:
  this.body = null;

  // Child nodes are stored in quads. Each quad is presented by number:
  // 0 | 1
  // -----
  // 2 | 3
${d("  this.")}

  // Total mass of current node
  this.mass = 0;

  // Center of mass coordinates
  ${e("this.mass_{var} = 0;",{indent:2})}

  // bounding box coordinates
  ${e("this.min_{var} = 0;",{indent:2})}
  ${e("this.max_{var} = 0;",{indent:2})}
}
`;return s;function d(u){let l=[];for(let v=0;v<a;++v)l.push(`${u}quad${v} = null;`);return l.join(`
`)}}function fe(){return`
/**
 * Our implementation of QuadTree is non-recursive to avoid GC hit
 * This data structure represent stack of elements
 * which we are trying to insert into quad tree.
 */
function InsertStack () {
    this.stack = [];
    this.popIdx = 0;
}

InsertStack.prototype = {
    isEmpty: function() {
        return this.popIdx === 0;
    },
    push: function (node, body) {
        var item = this.stack[this.popIdx];
        if (!item) {
            // we are trying to avoid memory pressure: create new element
            // only when absolutely necessary
            this.stack[this.popIdx] = new InsertStackElement(node, body);
        } else {
            item.node = node;
            item.body = body;
        }
        ++this.popIdx;
    },
    pop: function () {
        if (this.popIdx > 0) {
            return this.stack[--this.popIdx];
        }
    },
    reset: function () {
        this.popIdx = 0;
    }
};

function InsertStackElement(node, body) {
    this.node = node; // QuadTree node
    this.body = body; // physical body which needs to be inserted to node
}
`}var $e=C.exports,G={exports:{}};G.exports=Fe;G.exports.generateFunctionBody=ce;const Ce=P;function Fe(t){let e=ce(t);return new Function("bodies","settings","random",e)}function ce(t){let e=Ce(t);return`
  var boundingBox = {
    ${e("min_{var}: 0, max_{var}: 0,",{indent:4})}
  };

  return {
    box: boundingBox,

    update: updateBoundingBox,

    reset: resetBoundingBox,

    getBestNewPosition: function (neighbors) {
      var ${e("base_{var} = 0",{join:", "})};

      if (neighbors.length) {
        for (var i = 0; i < neighbors.length; ++i) {
          let neighborPos = neighbors[i].pos;
          ${e("base_{var} += neighborPos.{var};",{indent:10})}
        }

        ${e("base_{var} /= neighbors.length;",{indent:8})}
      } else {
        ${e("base_{var} = (boundingBox.min_{var} + boundingBox.max_{var}) / 2;",{indent:8})}
      }

      var springLength = settings.springLength;
      return {
        ${e("{var}: base_{var} + (random.nextDouble() - 0.5) * springLength,",{indent:8})}
      };
    }
  };

  function updateBoundingBox() {
    var i = bodies.length;
    if (i === 0) return; // No bodies - no borders.

    ${e("var max_{var} = -Infinity;",{indent:4})}
    ${e("var min_{var} = Infinity;",{indent:4})}

    while(i--) {
      // this is O(n), it could be done faster with quadtree, if we check the root node bounds
      var bodyPos = bodies[i].pos;
      ${e("if (bodyPos.{var} < min_{var}) min_{var} = bodyPos.{var};",{indent:6})}
      ${e("if (bodyPos.{var} > max_{var}) max_{var} = bodyPos.{var};",{indent:6})}
    }

    ${e("boundingBox.min_{var} = min_{var};",{indent:4})}
    ${e("boundingBox.max_{var} = max_{var};",{indent:4})}
  }

  function resetBoundingBox() {
    ${e("boundingBox.min_{var} = boundingBox.max_{var} = 0;",{indent:4})}
  }
`}var _e=G.exports,U={exports:{}};const Se=P;U.exports=qe;U.exports.generateCreateDragForceFunctionBody=ve;function qe(t){let e=ve(t);return new Function("options",e)}function ve(t){return`
  if (!Number.isFinite(options.dragCoefficient)) throw new Error('dragCoefficient is not a finite number');

  return {
    update: function(body) {
      ${Se(t)("body.force.{var} -= options.dragCoefficient * body.velocity.{var};",{indent:6})}
    }
  };
`}var Ie=U.exports,z={exports:{}};const Pe=P;z.exports=Ne;z.exports.generateCreateSpringForceFunctionBody=pe;function Ne(t){let e=pe(t);return new Function("options","random",e)}function pe(t){let e=Pe(t);return`
  if (!Number.isFinite(options.springCoefficient)) throw new Error('Spring coefficient is not a number');
  if (!Number.isFinite(options.springLength)) throw new Error('Spring length is not a number');

  return {
    /**
     * Updates forces acting on a spring
     */
    update: function (spring) {
      var body1 = spring.from;
      var body2 = spring.to;
      var length = spring.length < 0 ? options.springLength : spring.length;
      ${e("var d{var} = body2.pos.{var} - body1.pos.{var};",{indent:6})}
      var r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});

      if (r === 0) {
        ${e("d{var} = (random.nextDouble() - 0.5) / 50;",{indent:8})}
        r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});
      }

      var d = r - length;
      var coefficient = ((spring.coefficient > 0) ? spring.coefficient : options.springCoefficient) * d / r;

      ${e("body1.force.{var} += coefficient * d{var}",{indent:6})};
      body1.springCount += 1;
      body1.springLength += r;

      ${e("body2.force.{var} -= coefficient * d{var}",{indent:6})};
      body2.springCount += 1;
      body2.springLength += r;
    }
  };
`}var Me=z.exports,J={exports:{}};const Ee=P;J.exports=je;J.exports.generateIntegratorFunctionBody=he;function je(t){let e=he(t);return new Function("bodies","timeStep","adaptiveTimeStepWeight",e)}function he(t){let e=Ee(t);return`
  var length = bodies.length;
  if (length === 0) return 0;

  ${e("var d{var} = 0, t{var} = 0;",{indent:2})}

  for (var i = 0; i < length; ++i) {
    var body = bodies[i];
    if (body.isPinned) continue;

    if (adaptiveTimeStepWeight && body.springCount) {
      timeStep = (adaptiveTimeStepWeight * body.springLength/body.springCount);
    }

    var coeff = timeStep / body.mass;

    ${e("body.velocity.{var} += coeff * body.force.{var};",{indent:4})}
    ${e("var v{var} = body.velocity.{var};",{indent:4})}
    var v = Math.sqrt(${e("v{var} * v{var}",{join:" + "})});

    if (v > 1) {
      // We normalize it so that we move within timeStep range. 
      // for the case when v <= 1 - we let velocity to fade out.
      ${e("body.velocity.{var} = v{var} / v;",{indent:6})}
    }

    ${e("d{var} = timeStep * body.velocity.{var};",{indent:4})}

    ${e("body.pos.{var} += d{var};",{indent:4})}

    ${e("t{var} += Math.abs(d{var});",{indent:4})}
  }

  return (${e("t{var} * t{var}",{join:" + "})})/length;
`}var Te=J.exports,A,X;function Le(){if(X)return A;X=1,A=t;function t(e,a,s,d){this.from=e,this.to=a,this.length=s,this.coefficient=d}return A}var V,H;function ke(){if(H)return V;H=1,V=t;function t(e,a){var s;if(e||(e={}),a){for(s in a)if(a.hasOwnProperty(s)){var d=e.hasOwnProperty(s),u=typeof a[s],l=!d||typeof e[s]!==u;l?e[s]=a[s]:u==="object"&&(e[s]=t(e[s],a[s]))}}return e}return V}var j={exports:{}},K;function Oe(){if(K)return j.exports;K=1,j.exports=t,j.exports.random=t,j.exports.randomIterator=v;function t(r){var f=typeof r=="number"?r:+new Date;return new e(f)}function e(r){this.seed=r}e.prototype.next=l,e.prototype.nextDouble=u,e.prototype.uniform=u,e.prototype.gaussian=a,e.prototype.random=u;function a(){var r,f,c;do f=this.nextDouble()*2-1,c=this.nextDouble()*2-1,r=f*f+c*c;while(r>=1||r===0);return f*Math.sqrt(-2*Math.log(r)/r)}e.prototype.levy=s;function s(){var r=1.5,f=Math.pow(d(1+r)*Math.sin(Math.PI*r/2)/(d((1+r)/2)*r*Math.pow(2,(r-1)/2)),1/r);return this.gaussian()*f/Math.pow(Math.abs(this.gaussian()),1/r)}function d(r){return Math.sqrt(2*Math.PI/r)*Math.pow(1/Math.E*(r+1/(12*r-1/(10*r))),r)}function u(){var r=this.seed;return r=r+2127912214+(r<<12)&4294967295,r=(r^3345072700^r>>>19)&4294967295,r=r+374761393+(r<<5)&4294967295,r=(r+3550635116^r<<9)&4294967295,r=r+4251993797+(r<<3)&4294967295,r=(r^3042594569^r>>>16)&4294967295,this.seed=r,(r&268435455)/268435456}function l(r){return Math.floor(this.nextDouble()*r)}function v(r,f){var c=f||t();if(typeof c.next!="function")throw new Error("customRandom does not match expected API: next() function is missing");return{forEach:_,shuffle:b};function b(){var g,p,y;for(g=r.length-1;g>0;--g)p=c.next(g+1),y=r[p],r[p]=r[g],r[g]=y;return r}function _(g){var p,y,m;for(p=r.length-1;p>0;--p)y=c.next(p+1),m=r[y],r[y]=r[p],r[p]=m,g(m);r.length&&g(r[0])}}return j.exports}var le=Ge,De=we,Qe=$e,Ae=_e,Ve=Ie,Re=Me,We=Te,Y={};function Ge(t){var e=Le(),a=ke(),s=Z;if(t){if(t.springCoeff!==void 0)throw new Error("springCoeff was renamed to springCoefficient");if(t.dragCoeff!==void 0)throw new Error("dragCoeff was renamed to dragCoefficient")}t=a(t,{springLength:10,springCoefficient:.8,gravity:-12,theta:.8,dragCoefficient:.9,timeStep:.5,adaptiveTimeStepWeight:0,dimensions:2,debug:!1});var d=Y[t.dimensions];if(!d){var u=t.dimensions;d={Body:De(u,t.debug),createQuadTree:Qe(u),createBounds:Ae(u),createDragForce:Ve(u),createSpringForce:Re(u),integrate:We(u)},Y[u]=d}var l=d.Body,v=d.createQuadTree,r=d.createBounds,f=d.createDragForce,c=d.createSpringForce,b=d.integrate,_=n=>new l(n),g=Oe().random(42),p=[],y=[],m=v(t,g),S=r(p,t,g),L=c(t,g),O=f(t),N=0,F=[],x=new Map,k=0;E("nbody",Q),E("spring",o);var M={bodies:p,quadTree:m,springs:y,settings:t,addForce:E,removeForce:q,getForces:D,step:function(){for(var n=0;n<F.length;++n)F[n](k);var i=b(p,t.timeStep,t.adaptiveTimeStepWeight);return k+=1,i},addBody:function(n){if(!n)throw new Error("Body is required");return p.push(n),n},addBodyAt:function(n){if(!n)throw new Error("Body position is required");var i=_(n);return p.push(i),i},removeBody:function(n){if(n){var i=p.indexOf(n);if(!(i<0))return p.splice(i,1),p.length===0&&S.reset(),!0}},addSpring:function(n,i,h,B){if(!n||!i)throw new Error("Cannot add null spring to force simulator");typeof h!="number"&&(h=-1);var I=new e(n,i,h,B>=0?B:-1);return y.push(I),I},getTotalMovement:function(){return N},removeSpring:function(n){if(n){var i=y.indexOf(n);if(i>-1)return y.splice(i,1),!0}},getBestNewBodyPosition:function(n){return S.getBestNewPosition(n)},getBBox:w,getBoundingBox:w,invalidateBBox:function(){console.warn("invalidateBBox() is deprecated, bounds always recomputed on `getBBox()` call")},gravity:function(n){return n!==void 0?(t.gravity=n,m.options({gravity:n}),this):t.gravity},theta:function(n){return n!==void 0?(t.theta=n,m.options({theta:n}),this):t.theta},random:g};return Ue(t,M),s(M),M;function w(){return S.update(),S.box}function E(n,i){if(x.has(n))throw new Error("Force "+n+" is already added");x.set(n,i),F.push(i)}function q(n){var i=F.indexOf(x.get(n));i<0||(F.splice(i,1),x.delete(n))}function D(){return x}function Q(){if(p.length!==0){m.insertBodies(p);for(var n=p.length;n--;){var i=p[n];i.isPinned||(i.reset(),m.updateBodyForce(i),O.update(i))}}}function o(){for(var n=y.length;n--;)L.update(y[n])}}function Ue(t,e){for(var a in t)ze(t,e,a)}function ze(t,e,a){if(t.hasOwnProperty(a)&&typeof e[a]!="function"){var s=Number.isFinite(t[a]);s?e[a]=function(d){if(d!==void 0){if(!Number.isFinite(d))throw new Error("Value of "+a+" should be a valid number.");return t[a]=d,e}return t[a]}:e[a]=function(d){return d!==void 0?(t[a]=d,e):t[a]}}}R.exports=He;var Je=R.exports.simulator=le,Xe=Z;function He(t,e){if(!t)throw new Error("Graph structure cannot be undefined");var a=e&&e.createSimulator||le,s=a(e);if(Array.isArray(e))throw new Error("Physics settings is expected to be an object");var d=t.version>19?Q:D;e&&typeof e.nodeMass=="function"&&(d=e.nodeMass);var u=new Map,l={},v=0,r=s.settings.springTransform||Ke;O(),m();var f=!1,c={step:function(){if(v===0)return b(!0),!0;var o=s.step();c.lastMove=o,c.fire("step");var n=o/v,i=n<=.01;return b(i),i},getNodePosition:function(o){return q(o).pos},setNodePosition:function(o){var n=q(o);n.setPosition.apply(n,Array.prototype.slice.call(arguments,1))},getLinkPosition:function(o){var n=l[o];if(n)return{from:n.from.pos,to:n.to.pos}},getGraphRect:function(){return s.getBBox()},forEachBody:_,pinNode:function(o,n){var i=q(o.id);i.isPinned=!!n},isNodePinned:function(o){return q(o.id).isPinned},dispose:function(){t.off("changed",L),c.fire("disposed")},getBody:y,getSpring:p,getForceVectorLength:g,simulator:s,graph:t,lastMove:0};return Xe(c),c;function b(o){f!==o&&(f=o,S(o))}function _(o){u.forEach(o)}function g(){var o=0,n=0;return _(function(i){o+=Math.abs(i.force.x),n+=Math.abs(i.force.y)}),Math.sqrt(o*o+n*n)}function p(o,n){var i;if(n===void 0)typeof o!="object"?i=o:i=o.id;else{var h=t.hasLink(o,n);if(!h)return;i=h.id}return l[i]}function y(o){return u.get(o)}function m(){t.on("changed",L)}function S(o){c.fire("stable",o)}function L(o){for(var n=0;n<o.length;++n){var i=o[n];i.changeType==="add"?(i.node&&N(i.node.id),i.link&&x(i.link)):i.changeType==="remove"&&(i.node&&F(i.node),i.link&&k(i.link))}v=t.getNodesCount()}function O(){v=0,t.forEachNode(function(o){N(o.id),v+=1}),t.forEachLink(x)}function N(o){var n=u.get(o);if(!n){var i=t.getNode(o);if(!i)throw new Error("initBody() was called with unknown node id");var h=i.position;if(!h){var B=M(i);h=s.getBestNewBodyPosition(B)}n=s.addBodyAt(h),n.id=o,u.set(o,n),w(o),E(i)&&(n.isPinned=!0)}}function F(o){var n=o.id,i=u.get(n);i&&(u.delete(n),s.removeBody(i))}function x(o){w(o.fromId),w(o.toId);var n=u.get(o.fromId),i=u.get(o.toId),h=s.addSpring(n,i,o.length);r(o,h),l[o.id]=h}function k(o){var n=l[o.id];if(n){var i=t.getNode(o.fromId),h=t.getNode(o.toId);i&&w(i.id),h&&w(h.id),delete l[o.id],s.removeSpring(n)}}function M(o){var n=[];if(!o.links)return n;for(var i=Math.min(o.links.length,2),h=0;h<i;++h){var B=o.links[h],I=B.fromId!==o.id?u.get(B.fromId):u.get(B.toId);I&&I.pos&&n.push(I)}return n}function w(o){var n=u.get(o);if(n.mass=d(o),Number.isNaN(n.mass))throw new Error("Node mass should be a number")}function E(o){return o&&(o.isPinned||o.data&&o.data.isPinned)}function q(o){var n=u.get(o);return n||(N(o),n=u.get(o)),n}function D(o){var n=t.getLinks(o);return n?1+n.length/3:1}function Q(o){var n=t.getLinks(o);return n?1+n.size/3:1}}function Ke(){}var ge=R.exports;const Ye=ye(ge),tt=me({__proto__:null,default:Ye,simulator:Je},[ge]);export{tt as i};
//# sourceMappingURL=index-15e1aa7f.js.map
