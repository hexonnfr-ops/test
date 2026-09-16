export interface HeightFieldMeshOptions {
  /** World-space height multiplier applied to terrain magnitude. */
  heightScale?: number;
  /** Sample every Nth terrain tile. Last row/column are always included. */
  stride?: number;
}

export interface HeightFieldMesh {
  /** xyz triples in OpenFront world coordinates. */
  positions: Float32Array;
  /** xyz normal triples, one per vertex. */
  normals: Float32Array;
  /** uv pairs spanning the complete source map. */
  uvs: Float32Array;
  /** Indexed triangles suitable for gl.drawElements. */
  indices: Uint32Array;
  columns: number;
  rows: number;
}

/**
 * OpenFront terrain byte → visual height. The authoritative terrain byte uses:
 * bit 7 land, bit 6 shoreline, bits 0..4 magnitude. This function only derives
 * render geometry; it does not modify map/game state.
 */
export function terrainByteToHeight(
  terrainByte: number,
  heightScale = 1,
): number {
  const isLand = (terrainByte & 0x80) !== 0;
  const shoreline = (terrainByte & 0x40) !== 0;
  const magnitude = terrainByte & 0x1f;

  if (!isLand) {
    // A shallow negative ocean floor creates genuine vertical separation from
    // the coastline while leaving the water surface free for a later wave pass.
    return -Math.min(magnitude, 10) * 0.035 * heightScale;
  }
  if (shoreline) return 0.12 * heightScale;

  // Preserve OpenFront's existing lowland/highland/mountain magnitude signal.
  const normalized = Math.min(magnitude, 30) / 30;
  return Math.pow(normalized, 1.45) * 8 * heightScale;
}

function sampledAxis(size: number, stride: number): number[] {
  const axis: number[] = [];
  for (let value = 0; value < size; value += stride) axis.push(value);
  if (axis[axis.length - 1] !== size - 1) axis.push(size - 1);
  return axis;
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Build a genuine indexed X/Y/Z height-field mesh from OpenFront terrain. */
export function buildHeightFieldMesh(
  terrainBytes: Uint8Array,
  width: number,
  height: number,
  options: HeightFieldMeshOptions = {},
): HeightFieldMesh {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) {
    throw new Error("Height field requires integer dimensions >= 2");
  }
  if (terrainBytes.length < width * height) {
    throw new Error("Terrain byte buffer is smaller than width * height");
  }

  const stride = Math.max(1, Math.floor(options.stride ?? 1));
  const heightScale = options.heightScale ?? 1;
  const xs = sampledAxis(width, stride);
  const ys = sampledAxis(height, stride);
  const columns = xs.length;
  const rows = ys.length;
  const vertexCount = columns * rows;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const heights = new Float32Array(vertexCount);

  const vertexIndex = (column: number, row: number): number => row * columns + column;
  const sourceHeight = (x: number, y: number): number =>
    terrainByteToHeight(terrainBytes[y * width + x], heightScale);

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = xs[column];
      const y = ys[row];
      const vertex = vertexIndex(column, row);
      const z = sourceHeight(x, y);
      heights[vertex] = z;

      const p = vertex * 3;
      positions[p] = x;
      positions[p + 1] = y;
      positions[p + 2] = z;

      const uv = vertex * 2;
      uvs[uv] = x / (width - 1);
      uvs[uv + 1] = y / (height - 1);
    }
  }

  // Gradient-derived normals. Positive Z points away from the map plane.
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const left = Math.max(0, column - 1);
      const right = Math.min(columns - 1, column + 1);
      const up = Math.max(0, row - 1);
      const down = Math.min(rows - 1, row + 1);
      const dx = xs[right] - xs[left] || 1;
      const dy = ys[down] - ys[up] || 1;
      const dzdx =
        (heights[vertexIndex(right, row)] - heights[vertexIndex(left, row)]) / dx;
      const dzdy =
        (heights[vertexIndex(column, down)] - heights[vertexIndex(column, up)]) / dy;
      const [nx, ny, nz] = normalize3(-dzdx, -dzdy, 1);
      const n = vertexIndex(column, row) * 3;
      normals[n] = nx;
      normals[n + 1] = ny;
      normals[n + 2] = nz;
    }
  }

  const triangleCount = (columns - 1) * (rows - 1) * 2;
  const indices = new Uint32Array(triangleCount * 3);
  let cursor = 0;
  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const a = vertexIndex(column, row);
      const b = vertexIndex(column + 1, row);
      const c = vertexIndex(column, row + 1);
      const d = vertexIndex(column + 1, row + 1);
      indices[cursor++] = a;
      indices[cursor++] = c;
      indices[cursor++] = b;
      indices[cursor++] = b;
      indices[cursor++] = c;
      indices[cursor++] = d;
    }
  }

  return { positions, normals, uvs, indices, columns, rows };
}
