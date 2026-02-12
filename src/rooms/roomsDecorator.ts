import {
  DecorateContext,
  GraphicType,
  IModelApp,
  type RenderGraphic,
} from "@itwin/core-frontend";
import type { Decorator } from "@itwin/core-frontend";
import { ColorDef } from "@itwin/core-common";
import { Point3d, Transform } from "@itwin/core-geometry";

export class RoomsDecorator implements Decorator {
  private _graphic?: RenderGraphic;
  private _pendingPolys?: {
    points: { x: number; y: number }[];
    z?: number;
    fill?: ColorDef;
    stroke?: ColorDef;
    origin?: { x: number; y: number; z: number };
    yaw?: number;
    pitch?: number;
    roll?: number;
  }[];

  public setPolygons(polys: {
    points: { x: number; y: number }[];
    z?: number;
    fill?: ColorDef;
    stroke?: ColorDef;
    origin?: { x: number; y: number; z: number };
    yaw?: number;
    pitch?: number;
    roll?: number;
  }[]) {
    this._pendingPolys = polys;
    IModelApp.viewManager.invalidateDecorationsAllViews();
  }

  private transformPoint(pt: { x: number; y: number }, z: number, _origin?: { x: number; y: number; z: number }, _yaw?: number, _pitch?: number, _roll?: number): Point3d {
    // Footprints are already transformed to world coordinates by the backend
    // (via localToWorld transform during geometry extraction).
    // The origin/yaw/pitch/roll metadata is for reference only, not additional transformation.
    return Point3d.create(pt.x, pt.y, z);
  }

  public decorate(ctx: DecorateContext) {
    if (!this._graphic && this._pendingPolys && this._pendingPolys.length > 0) {
      const builder = IModelApp.renderSystem.createGraphicBuilder(Transform.createIdentity(), GraphicType.WorldDecoration, ctx.viewport);

      for (const poly of this._pendingPolys) {
        const z = poly.z ?? 0;
        const pts3d = poly.points.map((p) => this.transformPoint(p, z, poly.origin, poly.yaw, poly.pitch, poly.roll));
        if (pts3d.length < 3) continue;

        builder.setSymbology(poly.stroke ?? ColorDef.black, poly.fill ?? ColorDef.from(31, 119, 180, 40), 1);
        builder.addShape(pts3d);

        builder.setSymbology(poly.stroke ?? ColorDef.black, ColorDef.black, 1);
        builder.addLineString([...pts3d, pts3d[0]]);
      }

      this._graphic = builder.finish();
      this._pendingPolys = undefined;
    }

    if (this._graphic) ctx.addDecoration(GraphicType.WorldDecoration, this._graphic);
  }

  public onCleanup() {
    this._graphic = undefined;
  }
}
