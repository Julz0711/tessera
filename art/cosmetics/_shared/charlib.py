"""
Building blocks for low-poly characters. Runs inside Blender (bpy); a character's build.py imports it.

Conventions: 1 unit = character height (top of head = 1.0), feet on z = 0, character faces -Y, its left is +X.
Everything is built in rest pose (arms in a slight A), weighted, joined into one mesh, then posed.
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

PALETTE = {
    "skin-1": "#F1C9A5", "skin-2": "#D9A27A", "skin-3": "#A86F4C", "skin-4": "#6B4430",
    "hair-dark": "#3B2A20", "hair-grey": "#B8B2A7", "hair-auburn": "#8A4B2A",
    "navy": "#2E3F5C", "oxblood": "#7A2E2E", "forest": "#3F5E3A", "linen": "#E8DCC3", "charcoal": "#3A3A3F",
    "leather-dark": "#5A3B26", "leather-light": "#9B6B43", "wood": "#8B5E3C", "brass": "#C9A14A",
    "iron": "#7D8288", "bone-white": "#F4EFE6", "player": "#D04A3A",
}
METAL = {"brass": 0.6, "iron": 0.5}


# ---------------------------------------------------------------- basics

def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]


def mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = srgb(PALETTE[name])
    b.inputs["Roughness"].default_value = 0.85
    b.inputs["Metallic"].default_value = METAL.get(name, 0.0)
    m.diffuse_color = srgb(PALETTE[name])
    return m


def coll(name, clear=False):
    c = bpy.data.collections.get(name)
    if c and clear:
        for o in list(c.objects):
            bpy.data.objects.remove(o, do_unlink=True)
    if not c:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def flat(o):
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def apply_all(o):
    with bpy.context.temp_override(object=o, active_object=o):
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    return o


def solidify(o, t, offset=1.0):
    m = o.modifiers.new("Sol", "SOLIDIFY")
    m.thickness = t
    m.offset = offset
    return apply_all(flat(o))


def from_bm(name, bm, collection, material):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    collection.objects.link(o)
    if material:
        me.materials.append(mat(material))
    return flat(o)


def TRS(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    r = Matrix.Rotation(math.radians(rot[2]), 4, "Z") @ Matrix.Rotation(math.radians(rot[1]), 4, "Y") @ Matrix.Rotation(math.radians(rot[0]), 4, "X")
    return Matrix.Translation(loc) @ r @ Matrix.Diagonal((*scale, 1))


def along(origin, direction):
    """Matrix that maps +Z onto a direction, placed at origin."""
    return Matrix.Translation(origin) @ Vector((0, 0, 1)).rotation_difference(Vector(direction).normalized()).to_matrix().to_4x4()


def prim(name, kind, collection, material, M=None, n=8, r1=1.0, r2=1.0, sub=1, seg=8, rings=6):
    bm = bmesh.new()
    if kind == "cube":
        bmesh.ops.create_cube(bm, size=1.0)
    elif kind == "cyl":
        bmesh.ops.create_cone(bm, cap_ends=True, segments=n, radius1=1.0, radius2=1.0, depth=1.0)
    elif kind == "cone":
        bmesh.ops.create_cone(bm, cap_ends=True, segments=n, radius1=r1, radius2=r2, depth=1.0)
    elif kind == "ico":
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    elif kind == "sphere":
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    if M is not None:
        bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return from_bm(name, bm, collection, material)


def tri_mesh(name, pts, faces, collection, material, thickness=0.0):
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in pts]
    for f in faces:
        bm.faces.new([vs[i] for i in f])
    o = from_bm(name, bm, collection, material)
    return solidify(o, thickness) if thickness else o


def ring_mesh(name, rings, top, bottom, collection, material, loc=(0, 0, 0), scale=1.0):
    """Closed mesh from stacked rings. rings: [(z, half profile [(x, y)] front centre .. back centre)], mirrored on X."""
    L = Vector(loc)
    bm = bmesh.new()
    R = []
    for z, half in rings:
        pts = list(half) + [(-x, y) for x, y in reversed(half[1:-1])]
        R.append([bm.verts.new(Vector((x, y, z)) * scale + L) for x, y in pts])
    n = len(R[0])
    for a, b in zip(R, R[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    t = bm.verts.new(Vector(top) * scale + L)
    bo = bm.verts.new(Vector(bottom) * scale + L)
    for i in range(n):
        bm.faces.new((R[-1][i], R[-1][(i + 1) % n], t))
        bm.faces.new((R[0][(i + 1) % n], R[0][i], bo))
    return from_bm(name, bm, collection, material)


def shell(name, rings, n, collection, material, thickness=0.008, close=False, outward=True):
    """Tube from elliptic rings: (z, rx, ry, yoff, open_angle[, jag]). Angle 0 = front; an open front skips |a| < open."""
    bm = bmesh.new()
    R = []
    for ring in rings:
        z, rx, ry, yo, op = ring[:5]
        jag = ring[5] if len(ring) > 5 else 0.0
        a0, a1 = (0.0, 2 * math.pi) if close else (op, 2 * math.pi - op)
        cnt = n if close else n + 1
        row = []
        for i in range(cnt):
            a = a0 + (a1 - a0) * i / n
            dz = (jag if i % 2 else -jag * 0.5) if jag else 0.0
            row.append(bm.verts.new((rx * math.sin(a), -ry * math.cos(a) + yo, z + dz)))
        R.append(row)
    for a, b in zip(R, R[1:]):
        m = len(a)
        for i in (range(m) if close else range(m - 1)):
            bm.faces.new((a[i], a[(i + 1) % m], b[(i + 1) % m], b[i]))
    o = from_bm(name, bm, collection, material)
    orient_out(o, (0, 0, None))
    return solidify(o, thickness) if thickness else o


def orient_out(o, centre):
    """Flip faces so they point away from a vertical axis (centre x, y; z ignored) or a point."""
    cx, cy, cz = centre
    for p in o.data.polygons:
        c = p.center
        ref = Vector((c.x - cx, c.y - cy, 0 if cz is None else c.z - cz))
        if p.normal.dot(ref) < 0:
            p.flip()
    o.data.update()


def skin_mesh(name, spec, edges, collection, root, sub=1, decimate=None):
    idx = {n: i for i, (n, _, _) in enumerate(spec)}
    me = bpy.data.meshes.new(name)
    me.from_pydata([p for _, p, _ in spec], [(idx[a], idx[b]) for a, b in edges], [])
    o = bpy.data.objects.new(name, me)
    collection.objects.link(o)
    m = o.modifiers.new("Skin", "SKIN")
    m.branch_smoothing = 0.6
    m.use_smooth_shade = False
    sv = me.skin_vertices[0].data
    for i, (_, _, r) in enumerate(spec):
        sv[i].radius = r
        sv[i].use_root = i == idx[root]
    if sub:
        s = o.modifiers.new("Sub", "SUBSURF")
        s.levels = s.render_levels = sub
    if decimate:
        d = o.modifiers.new("Dec", "DECIMATE")
        d.ratio = decimate
    return flat(apply_all(o))


def extent(o, z, band=0.025, xmax=0.2):
    vs = [v.co for v in o.data.vertices if abs(v.co.z - z) < band and abs(v.co.x) < xmax]
    if not vs:
        return 0.05, 0.05, 0.0
    ys = [v.y for v in vs]
    return max(abs(v.x) for v in vs), (max(ys) - min(ys)) / 2, (max(ys) + min(ys)) / 2


def join(objs, name):
    base = objs[0]
    for o in objs[1:]:
        for vg in o.vertex_groups:
            if base.vertex_groups.get(vg.name) is None:
                base.vertex_groups.new(name=vg.name)
    with bpy.context.temp_override(active_object=base, selected_editable_objects=objs, selected_objects=objs):
        bpy.ops.object.join()
    base.name = base.data.name = name
    return base


def delete_faces(o, pred):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    kill = [f for f in bm.faces if pred(f.calc_center_median(), f)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(o.data)
    bm.free()
    return len(kill)


# ---------------------------------------------------------------- body

def body_spec(fem):
    k = 0.9 if fem else 1.0     # shoulders and chest
    h = 1.08 if fem else 1.0    # hips
    V = [
        ("pelvis", (0, 0.008, 0.50), (0.108 * h, 0.08)),
        ("waist", (0, 0.004, 0.585), (0.094 * (0.9 if fem else 1.0), 0.07)),
        ("chest", (0, -0.008, 0.675), (0.128 * k, 0.092)),
        ("upchest", (0, 0.0, 0.752), (0.142 * k, 0.08)),
        ("neck0", (0, 0.01, 0.803), (0.047 * (0.9 if fem else 1), 0.047)),
        ("neck1", (0, 0.006, 0.84), (0.04 * (0.9 if fem else 1), 0.042)),
    ]
    J = {}
    for s, L in ((1, "L"), (-1, "R")):
        J.update({
            "shoulder" + L: (s * 0.152 * k, 0.004, 0.77), "elbow" + L: (s * 0.21 * k, 0.014, 0.60),
            "wrist" + L: (s * 0.236 * k, 0.0, 0.455), "hip" + L: (s * 0.074 * h, 0.0, 0.468),
            "knee" + L: (s * 0.08, -0.008, 0.262), "ankle" + L: (s * 0.08, 0.004, 0.06), "toe" + L: (s * 0.082, -0.075, 0.025),
        })
        a = 0.92 if fem else 1.0
        V += [
            ("shoulder" + L, J["shoulder" + L], (0.054 * k, 0.052)),
            ("elbow" + L, J["elbow" + L], (0.04 * a, 0.041 * a)),
            ("wrist" + L, J["wrist" + L], (0.03 * a, 0.033 * a)),
            ("hip" + L, J["hip" + L], (0.072, 0.074)),
            ("thighmid" + L, (s * 0.078 * h, -0.006, 0.37), (0.064, 0.066)),
            ("knee" + L, J["knee" + L], (0.047, 0.05)),
            ("calf" + L, (s * 0.08, 0.01, 0.18), (0.05, 0.053)),
            ("ankle" + L, J["ankle" + L], (0.033, 0.036)),
            ("toe" + L, J["toe" + L], (0.038, 0.028)),
        ]
    E = [("pelvis", "waist"), ("waist", "chest"), ("chest", "upchest"), ("upchest", "neck0"), ("neck0", "neck1")]
    for L in "LR":
        E += [("upchest", "shoulder" + L), ("shoulder" + L, "elbow" + L), ("elbow" + L, "wrist" + L),
              ("pelvis", "hip" + L), ("hip" + L, "thighmid" + L), ("thighmid" + L, "knee" + L),
              ("knee" + L, "calf" + L), ("calf" + L, "ankle" + L), ("ankle" + L, "toe" + L)]
    return V, E, J


def build_body(name, collection, fem):
    V, E, J = body_spec(fem)
    body = skin_mesh(name, V, E, collection, "pelvis", sub=1, decimate=0.55)
    for v in body.data.vertices:
        x, y, z = v.co
        if 0.48 < z < 0.8 and abs(x) < 0.15:
            t = min(1, (z - 0.48) / 0.2)
            v.co.y = y * (1.25 + 0.25 * t)
            if 0.63 < z < 0.77 and y < 0:
                bump = 0.024 if fem and 0.63 < z < 0.73 and 0.02 < abs(x) < 0.09 else 0.012
                v.co.y -= bump * math.sin((z - 0.63) / 0.14 * math.pi)
        if 0.42 < z < 0.52 and y > 0 and abs(x) < 0.14:
            v.co.y += 0.012 if fem else 0.01
    body.data.update()
    return body, J


# ---------------------------------------------------------------- head

HEAD_A = [  # (z, half profile: front centre, front-side, side-front, side, side-back, back centre)
    (-0.098, [(0, -0.064), (0.018, -0.06), (0.03, -0.04), (0.03, -0.02), (0.02, -0.008), (0, -0.004)]),
    (-0.08, [(0, -0.073), (0.026, -0.067), (0.046, -0.04), (0.049, -0.01), (0.036, 0.008), (0, 0.016)]),
    (-0.055, [(0, -0.078), (0.032, -0.069), (0.056, -0.038), (0.058, -0.004), (0.047, 0.022), (0, 0.032)]),
    (-0.03, [(0, -0.083), (0.04, -0.072), (0.064, -0.036), (0.066, 0.0), (0.056, 0.036), (0, 0.052)]),
    (0.0, [(0, -0.076), (0.035, -0.064), (0.066, -0.038), (0.069, 0.0), (0.061, 0.046), (0, 0.068)]),
    (0.018, [(0, -0.079), (0.04, -0.075), (0.067, -0.04), (0.071, 0.0), (0.063, 0.049), (0, 0.075)]),
    (0.045, [(0, -0.072), (0.035, -0.067), (0.061, -0.04), (0.068, 0.0), (0.06, 0.047), (0, 0.076)]),
    (0.075, [(0, -0.05), (0.028, -0.046), (0.045, -0.028), (0.05, 0.0), (0.045, 0.04), (0, 0.06)]),
]
HEAD_B = [  # softer jaw, rounder chin, lighter brow, fuller cheeks
    (-0.098, [(0, -0.06), (0.016, -0.057), (0.026, -0.04), (0.027, -0.022), (0.018, -0.01), (0, -0.006)]),
    (-0.08, [(0, -0.07), (0.023, -0.066), (0.042, -0.042), (0.046, -0.012), (0.035, 0.008), (0, 0.016)]),
    (-0.055, [(0, -0.075), (0.031, -0.068), (0.054, -0.04), (0.058, -0.004), (0.047, 0.022), (0, 0.032)]),
    (-0.03, [(0, -0.08), (0.039, -0.072), (0.063, -0.038), (0.066, 0.0), (0.056, 0.036), (0, 0.052)]),
    (0.0, [(0, -0.075), (0.035, -0.066), (0.065, -0.038), (0.068, 0.0), (0.061, 0.046), (0, 0.068)]),
    (0.018, [(0, -0.076), (0.039, -0.072), (0.066, -0.04), (0.07, 0.0), (0.063, 0.049), (0, 0.075)]),
    (0.045, [(0, -0.071), (0.035, -0.067), (0.06, -0.04), (0.067, 0.0), (0.06, 0.047), (0, 0.076)]),
    (0.075, [(0, -0.05), (0.028, -0.046), (0.045, -0.028), (0.05, 0.0), (0.045, 0.04), (0, 0.06)]),
]


class Head:
    """A ring-profile head placed at loc with a uniform scale; P() maps head-local to world."""

    def __init__(self, rings, loc, scale):
        self.rings = sorted(rings)
        self.loc = Vector(loc)
        self.s = scale

    def P(self, x, y, z):
        return Vector((x, y, z)) * self.s + self.loc

    def profile(self, z):
        R = self.rings
        if z <= R[0][0]:
            return R[0][1]
        for (za, ha), (zb, hb) in zip(R, R[1:]):
            if za <= z <= zb:
                t = (z - za) / (zb - za)
                return [(xa + (xb - xa) * t, ya + (yb - ya) * t) for (xa, ya), (xb, yb) in zip(ha, hb)]
        return R[-1][1]

    def surf(self, j, z, d, side=1):
        """Head-local point on column j (0 front .. 5 back) at height z, pushed out by d."""
        x, y = self.profile(z)[j]
        n = Vector((x, y + 0.01, 0))
        n = n.normalized() if n.length > 1e-6 else Vector((0, -1, 0))
        q = Vector((x, y, z)) + n * d
        return Vector((side * q.x, q.y, q.z))

    def top_z(self):
        return self.loc.z + 0.094 * self.s

    def mesh(self, name, collection, skin):
        return ring_mesh(name, self.rings, (0, 0.006, 0.094), (0, -0.03, -0.1), collection, skin, self.loc, self.s)


def head_grid(name, H, ncols, nrows, point, collection, material, thickness, closed=False):
    """Quad grid over the head from point(ci, ri) -> head-local Vector; solidified inward-outward."""
    bm = bmesh.new()
    G = {(c, r): bm.verts.new(H.P(*point(c, r))) for c in range(ncols) for r in range(nrows)}
    for c in range(ncols if closed else ncols - 1):
        c2 = (c + 1) % ncols
        for r in range(nrows - 1):
            bm.faces.new((G[(c, r)], G[(c2, r)], G[(c2, r + 1)], G[(c, r + 1)]))
    o = from_bm(name, bm, collection, material)
    orient_out(o, tuple(H.loc))
    return solidify(o, thickness, offset=-1)


# ---------------------------------------------------------------- rig and weights

def build_rig(name, J, collection, head_top):
    arm = bpy.data.armatures.new(name)
    rig = bpy.data.objects.new(name, arm)
    collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    with bpy.context.temp_override(active_object=rig, object=rig):
        bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.edit_bones

    def bone(n, h, t, parent=None, connect=False):
        b = eb.new(n)
        b.head, b.tail = h, t
        if parent:
            b.parent = eb[parent]
            b.use_connect = connect

    bone("root", (0, 0, 0), (0, 0, 0.1))
    bone("hips", (0, 0.004, 0.46), (0, 0.004, 0.54), "root")
    bone("spine", (0, 0.004, 0.54), (0, 0.0, 0.64), "hips", True)
    bone("chest", (0, 0.0, 0.64), (0, 0.0, 0.775), "spine", True)
    bone("neck", (0, 0.006, 0.79), (0, 0.004, 0.845), "chest")
    bone("head", (0, 0.004, 0.845), (0, 0.0, head_top), "neck", True)
    for s, L in ((1, "L"), (-1, "R")):
        sh, el, wr = Vector(J["shoulder" + L]), Vector(J["elbow" + L]), Vector(J["wrist" + L])
        bone(f"shoulder.{L}", (s * 0.03, 0.0, 0.765), sh + Vector((-s * 0.012, 0, 0.002)), "chest")
        bone(f"upper_arm.{L}", sh, el, f"shoulder.{L}")
        bone(f"forearm.{L}", el, wr, f"upper_arm.{L}", True)
        bone(f"hand.{L}", wr, wr + (wr - el).normalized() * 0.085, f"forearm.{L}", True)
        bone(f"thigh.{L}", J["hip" + L], J["knee" + L], "hips")
        bone(f"shin.{L}", J["knee" + L], J["ankle" + L], f"thigh.{L}", True)
        bone(f"foot.{L}", J["ankle" + L], J["toe" + L], f"shin.{L}", True)
    with bpy.context.temp_override(active_object=rig, object=rig):
        bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def auto_weights(mesh, rig):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    with bpy.context.temp_override(active_object=rig, selected_objects=[mesh, rig], selected_editable_objects=[mesh, rig]):
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")


def rigid(o, bone):
    o.vertex_groups.clear()
    o.vertex_groups.new(name=bone).add(range(len(o.data.vertices)), 1.0, "REPLACE")


def transfer(o, src):
    o.vertex_groups.clear()
    m = o.modifiers.new("DT", "DATA_TRANSFER")
    m.object = src
    m.use_vert_data = True
    m.data_types_verts = {"VGROUP_WEIGHTS"}
    m.vert_mapping = "POLYINTERP_NEAREST"
    m.layers_vgroup_select_src = "ALL"
    m.layers_vgroup_select_dst = "NAME"
    with bpy.context.temp_override(object=o, active_object=o):
        bpy.ops.object.datalayout_transfer(modifier="DT")
        bpy.ops.object.modifier_apply(modifier="DT")


def skirt(o, top=0.5, blend=0.1):
    """Below `top`, blend weights to the hips only, so leg poses don't tear coats and skirts."""
    hips = o.vertex_groups.get("hips") or o.vertex_groups.new(name="hips")
    for v in o.data.vertices:
        if v.co.z < top:
            k = min(1.0, (top - v.co.z) / blend)
            for g in list(v.groups):
                if o.vertex_groups[g.group].name != "hips":
                    o.vertex_groups[g.group].add([v.index], g.weight * (1 - k), "REPLACE")
            hips.add([v.index], k, "ADD")


# ---------------------------------------------------------------- posing

def _set(rig, name, q):
    pb = rig.pose.bones[name]
    bpy.context.view_layer.update()
    m = pb.matrix.copy()
    loc = m.to_translation()
    r = (q.to_matrix() @ m.to_3x3()).to_4x4()
    r.translation = loc
    pb.matrix = r
    bpy.context.view_layer.update()


def turn(rig, name, axis, deg):
    _set(rig, name, Quaternion(Vector(axis), math.radians(deg)))


def aim(rig, name, direction):
    pb = rig.pose.bones[name]
    bpy.context.view_layer.update()
    cur = (pb.tail - pb.head).normalized()
    _set(rig, name, cur.rotation_difference(Vector(direction).normalized()))


def reach(rig, side, wrist, pole, hand_dir):
    """Two-bone solve: put the wrist at a point, elbow toward the pole, hand along hand_dir."""
    bpy.context.view_layer.update()
    up, fo = rig.pose.bones[f"upper_arm.{side}"], rig.pose.bones[f"forearm.{side}"]
    S = up.head.copy()
    l1, l2 = up.length, fo.length
    T = Vector(wrist)
    d = min((T - S).length, (l1 + l2) * 0.999)
    u = (T - S).normalized()
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = math.sqrt(max(l1 * l1 - a * a, 0))
    p = Vector(pole) - S
    p = (p - u * p.dot(u)).normalized()
    E = S + u * a + p * h
    aim(rig, f"upper_arm.{side}", E - S)
    aim(rig, f"forearm.{side}", (S + u * d) - E)
    aim(rig, f"hand.{side}", hand_dir)


def ground(rig, mesh):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = mesh.evaluated_get(dg)
    zmin = min((ev.matrix_world @ v.co).z for v in ev.data.vertices) - rig.matrix_world.translation.z
    rig.pose.bones["root"].location = (0, -zmin, 0)   # root points up: local Y = world Z
    bpy.context.view_layer.update()
    return zmin


def bake_idle(rig, name="idle"):
    """3 s loop on the current stance: breathing chest, slight head sway, arms drift."""
    act = bpy.data.actions.get(name) or bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = act
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    base = {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in rig.pose.bones}
    for f, k in ((1, 0.0), (37, 1.0), (73, 0.0)):
        for pb in rig.pose.bones:
            q, loc = base[pb.name]
            if pb.name == "chest":
                q = q @ Quaternion((1, 0, 0), math.radians(-1.5 * k))
            if pb.name == "head":
                q = q @ Quaternion((0, 0, 1), math.radians(2.0 * k)) @ Quaternion((1, 0, 0), math.radians(1.2 * k))
            pb.rotation_quaternion = q
            pb.location = loc
            pb.keyframe_insert("rotation_quaternion", frame=f)
            pb.keyframe_insert("location", frame=f)
            if pb.name == "chest":
                pb.scale = (1 + 0.01 * k, 1 + 0.018 * k, 1 + 0.01 * k)
                pb.keyframe_insert("scale", frame=f)
    return act


def place_on_bone(o, rig, bone, M_world):
    """Move a rest-built object so that, posed, it sits at M_world on `bone` (rigidly weighted)."""
    pb = rig.pose.bones[bone]
    bpy.context.view_layer.update()
    o.data.transform(pb.bone.matrix_local @ pb.matrix.inverted() @ M_world)
    rigid(o, bone)


# ---------------------------------------------------------------- output

def render(folder, variant, scene=None, full=512, portrait=384):
    sc = scene or bpy.context.scene
    out = []
    for cam, size, fname in (("cam_full", full, f"preview-{variant}.png"), ("cam_portrait", portrait, f"portrait-{variant}.png")):
        sc.camera = bpy.data.objects[cam]
        sc.render.resolution_x = sc.render.resolution_y = size
        sc.render.filepath = folder + fname
        bpy.ops.render.render(write_still=True)
        out.append(folder + fname)
    return out


def export(rig, mesh, path):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    rig.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=True, export_animations=True, export_skins=True,
                              export_normals=False, export_texcoords=False, export_tangents=False,
                              export_materials="EXPORT", export_cameras=False, export_lights=False)
