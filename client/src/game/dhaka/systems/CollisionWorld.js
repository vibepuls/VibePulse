/** Broad-phase grid for scalable nearby collision queries. Coordinates are world meters. */
export class CollisionWorld {
  constructor(cellSize = 48) { this.cellSize = cellSize; this.cells = new Map(); }
  key(x,z) { return Math.floor(x/this.cellSize)+':'+Math.floor(z/this.cellSize); }
  rebuild(items = []) {
    this.cells.clear();
    for (const item of items) {
      const x = item.x ?? item.position?.x, z = item.z ?? item.position?.z;
      if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
      const key = this.key(x,z); if(!this.cells.has(key)) this.cells.set(key,[]);
      this.cells.get(key).push(item);
    }
  }
  query(x,z,radius = this.cellSize) {
    const result=[], minX=Math.floor((x-radius)/this.cellSize), maxX=Math.floor((x+radius)/this.cellSize), minZ=Math.floor((z-radius)/this.cellSize), maxZ=Math.floor((z+radius)/this.cellSize);
    for(let gx=minX;gx<=maxX;gx++)for(let gz=minZ;gz<=maxZ;gz++){const cell=this.cells.get(gx+':'+gz);if(cell)result.push(...cell);}
    return result;
  }
  nearby(x,z,radius,predicate=()=>true) { const r2=radius*radius;return this.query(x,z,radius).filter(item=>{const ix=item.x??item.position?.x,iz=item.z??item.position?.z;return Number.isFinite(ix)&&Number.isFinite(iz)&&(ix-x)**2+(iz-z)**2<=r2&&predicate(item);}); }
}
