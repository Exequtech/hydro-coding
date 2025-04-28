class Mat2 {
  public i: Vec2;
  public j: Vec2;
  public top: Vec2;
  public bottom: Vec2;

  // Takes in 2 basis vectors, i hat and j hat
  constructor(i1: Vec2 | number, j1: Vec2 | number, i2: number | null =null, j2: number | null =null) {
    if(i1 instanceof Vec2) {
      if(!(j1 instanceof Vec2))
        throw new Error("If i1 is Vec2, j1 must be Vec2.");

      this.i = i1;
      this.top = new Vec2(i1.x, j1.x);
      this.j = j1;
      this.bottom = new Vec2(i1.y, j1.y);
    } else {
      if(j1 instanceof Vec2)
        throw new Error("If i1 is num, j1 must be num.");
      if(i2 === null || j2 === null)
        throw new Error("If i1 is num, all must be num, not undefined");

      this.i = new Vec2(j1, i1);
      this.top = new Vec2(j1, j2);
      this.j = new Vec2(j2, i2);
      this.bottom = new Vec2(i1, i2);
    }
    Object.freeze(this);
  }

  Transform(vec: Vec2): Vec2 {
    return new Vec2(this.top.Dot(vec), this.bottom.Dot(vec));
  }
}

class Vec2 {
  public x: number;
  public y: number;

  constructor(x: number, y: number | null = null) {
    this.x = x;
    this.y = x;
    if(y !== null) {
      this.y = y;
    }

    Object.freeze(this); // 💎 Make this object immutable
  }

  private static createOther(x: number | Vec2, y: number | null): Vec2 {
    if(x instanceof Vec2) {
      return x;
    } else if (y === null) {
      return new Vec2(x, x);
    } else {
      return new Vec2(x, y);
    }
  }

  static zero(): Vec2 {
    return new Vec2(0, 0)
  }

  SqrLength(): number {
    return this.x*this.x + this.y*this.y;
  }

  Length(): number {
    return Math.sqrt(this.SqrLength());
  }

  Mult(x: number | Vec2, y: number | null = null): Vec2 {
    const other = Vec2.createOther(x, y);
    return new Vec2(this.x * other.x, this.y * other.y);
  }

  Div(x: number | Vec2, y: number | null = null): Vec2 {
    const other = Vec2.createOther(x, y);
    return new Vec2(this.x / other.x, this.y / other.y);
  }

  Normalize(): Vec2 {
    const len = this.Length();
    return len === 0 ? new Vec2(0, 0) : this.Mult(1 / len);
  }

  Add(x: number | Vec2, y: number | null = null) {
    const other = Vec2.createOther(x, y);
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  Sub(x: number | Vec2, y: number | null = null) {
    const other = Vec2.createOther(x, y);
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  toString() {
    return `Vec2(${this.x}, ${this.y})`;
  }

  Floor(): Vec2 {
    return new Vec2(Math.floor(this.x), Math.floor(this.y))
  }

  Equals(other: Vec2, epsilon = 1e-9) {
    return Math.abs(this.x - other.x) < epsilon && Math.abs(this.y - other.y) < epsilon;
  }

  Random(): Vec2 {
    return this.Mult(Math.random(), Math.random());
  }

  Dot(x: number | Vec2, y: number | null = null): number {
    const other = Vec2.createOther(x, y);
    return this.x * other.x + this.y * other.y;
  }

  // Rotate `angle` radians counterclockwise
  Rotate(angle: number) {
    /*
     * Left mult with Matrix:
     * [cos(t) -sin(t)] [x] 
     * [sin(t)  cos(t)] [y]
     * */
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const rotMat = new Mat2(new Vec2(cos, sin), new Vec2(-sin, cos));
    return rotMat.Transform(this);
  }
}

export default Vec2
