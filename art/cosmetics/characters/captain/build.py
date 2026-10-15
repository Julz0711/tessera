"""
Captain, variants a and b. Run inside Blender (Blender MCP):
    exec(open("E:/Coding/colonist/art/cosmetics/characters/captain/build.py").read())
Rebuilds both variants from scratch in the open file, poses them and keys the idle loop.
"""
import importlib
import math
import random
import sys

sys.path.insert(0, "E:/Coding/colonist/art/cosmetics/_shared")
import charlib  # noqa: E402

importlib.reload(charlib)
from charlib import (HEAD_A, HEAD_B, Head, Vector, along, auto_weights, bake_idle, build_body, build_rig, coll,  # noqa: E402
                     delete_faces, extent, ground, head_grid, join, mat, orient_out, place_on_bone, prim, reach, rigid,
                     shell, skin_mesh, skirt, solidify, transfer, tri_mesh, tris, turn, aim, TRS)
from mathutils import Matrix  # noqa: E402
import bmesh  # noqa: E402
import bpy  # noqa: E402

FOLDER = "E:/Coding/colonist/art/cosmetics/characters/captain/"
VARIANTS = {
    "a": dict(fem=False, skin="skin-2", hair="hair-grey", head=HEAD_A, head_loc=(0, -0.002, 0.912), head_scale=0.88, seat=0.05, x=-0.35),
    "b": dict(fem=True, skin="skin-3", hair="hair-dark", head=HEAD_B, head_loc=(0, -0.002, 0.905), head_scale=0.85, seat=0.058, x=0.35),
}


def face(v, cfg, H, C):
    fem, skin, hair = cfg["fem"], cfg["skin"], cfg["hair"]
    P = H.P
    out = {"head": [H.mesh(f"head_{v}", C, skin)]}
    k = 0.85 if fem else 1.0
    nose = tri_mesh(f"nose_{v}", [P(0, -0.077, 0.006), P(0, -0.077 - 0.02 * k, -0.03), P(0.017 * k, -0.08, -0.042),
                                  P(-0.017 * k, -0.08, -0.042), P(0, -0.085, -0.046)],
                    [(0, 2, 1), (0, 1, 3), (1, 2, 4), (1, 4, 3)], C, skin)
    orient_out(nose, tuple(H.loc))
    out["head"].append(nose)
    for s in (1, -1):
        ear = tri_mesh(f"ear{s}_{v}", [P(s * 0.064, 0.012, 0.012), P(s * 0.064, 0.03, -0.035), P(s * 0.064, -0.004, -0.03), P(s * 0.079, 0.018, -0.005)],
                       [(0, 1, 3), (1, 2, 3), (2, 0, 3), (0, 2, 1)], C, skin)
        orient_out(ear, tuple(H.loc))
        out["head"].append(ear)
        if fem:
            eye = [(0.014, -0.072, 0.003), (0.034, -0.068, 0.011), (0.052, -0.06, 0.005), (0.034, -0.069, -0.004)]
            brow = [(0.014, -0.078, 0.019), (0.036, -0.076, 0.027), (0.056, -0.066, 0.022), (0.054, -0.067, 0.018), (0.036, -0.077, 0.022), (0.016, -0.079, 0.015)]
            out["head"].append(tri_mesh(f"lash{s}_{v}", [P(s * 0.05, -0.061, 0.005), P(s * 0.06, -0.056, 0.013), P(s * 0.052, -0.06, 0.01)], [(0, 1, 2)], C, "hair-dark", 0.002))
            out["head"].append(prim(f"earring{s}_{v}", "ico", C, "brass", TRS(P(s * 0.068, 0.002, -0.048), scale=(0.008,) * 3), sub=1))
        else:
            eye = [(0.016, -0.072, 0.004), (0.034, -0.068, 0.009), (0.05, -0.06, 0.004), (0.034, -0.069, -0.003)]
            brow = [(0.012, -0.081, 0.02), (0.034, -0.079, 0.028), (0.056, -0.068, 0.024), (0.054, -0.07, 0.016), (0.034, -0.08, 0.018), (0.014, -0.082, 0.012)]
        out["head"].append(tri_mesh(f"eye{s}_{v}", [P(s * x, y, z) for x, y, z in eye], [(0, 1, 2, 3)], C, "hair-dark", 0.002))
        out["head"].append(tri_mesh(f"brow{s}_{v}", [P(s * x, y, z) for x, y, z in brow], [(0, 1, 4, 5), (1, 2, 3, 4)], C, hair, 0.003))
    if fem:
        out["head"].append(tri_mesh(f"lips_{v}", [P(0, -0.079, -0.056), P(0.017, -0.073, -0.058), P(0, -0.077, -0.064), P(-0.017, -0.073, -0.058)],
                                    [(0, 1, 2, 3)], C, "skin-4", 0.003))
    return out


def beard(v, H, C):
    seq = [(4, -1), (3, -1), (2, -1), (1, -1), (0, 1), (1, 1), (2, 1), (3, 1), (4, 1)]
    ztop = {0: -0.064, 1: -0.058, 2: -0.03, 3: 0.0, 4: -0.005}
    zbot = {0: -0.142, 1: -0.128, 2: -0.1, 3: -0.07, 4: -0.04}
    NR = 5

    def point(ci, ri):
        j, s = seq[ci]
        t = ri / (NR - 1)
        z = ztop[j] + (zbot[j] - ztop[j]) * t
        q = H.surf(j, max(z, -0.098), 0.005 + 0.012 * t, s)
        if z < -0.098:
            q = Vector((q.x * (1 - 2.5 * (-0.098 - z)), q.y + 0.25 * (-0.098 - z), z))
        r = random.Random(ci * 31 + ri)
        if ri == NR - 1:
            q.z += r.uniform(-0.008, 0.006)
        return q + Vector((r.uniform(-0.002, 0.002), r.uniform(-0.002, 0.002), 0))

    b = head_grid(f"beard_{v}", H, len(seq), NR, point, C, "hair-grey", 0.01)
    P = H.P
    m = tri_mesh(f"moustache_{v}", [P(0, -0.09, -0.045), P(0.026, -0.085, -0.05), P(0.05, -0.068, -0.078), P(0.034, -0.078, -0.062), P(0, -0.088, -0.058),
                                    P(-0.026, -0.085, -0.05), P(-0.05, -0.068, -0.078), P(-0.034, -0.078, -0.062)],
                 [(0, 1, 3, 4), (1, 2, 3), (0, 4, 7, 5), (5, 7, 6)], C, "hair-grey", 0.008)
    return [b, m]


def hair_a(v, H, C):
    seq = [(2, 1), (3, 1), (4, 1), (5, 1), (4, -1), (3, -1), (2, -1)]
    zs = [0.05, 0.02, -0.01, -0.035]

    def point(ci, ri):
        j, s = seq[ci]
        z = zs[ri]
        if j == 2 and ri > 1:
            z = 0.0
        q = H.surf(j, z, 0.003 + 0.003 * ri, s)
        if ri == len(zs) - 1:
            q.z += (-0.012 if ci % 2 else 0.004)
        return q

    h = head_grid(f"hair_{v}", H, len(seq), len(zs), point, C, "hair-grey", 0.008)
    P = H.P
    q = prim(f"queue_{v}", "cone", C, "hair-grey", Matrix.Translation(P(0, 0.074, -0.075)) @ Matrix.Rotation(math.radians(18), 4, "X") @ Matrix.Diagonal((1, 0.8, 0.085, 1)), n=6, r1=0.006, r2=0.02)
    rb = prim(f"ribbon_{v}", "cyl", C, "oxblood", Matrix.Translation(P(0, 0.07, -0.04)) @ Matrix.Rotation(math.radians(18), 4, "X") @ Matrix.Diagonal((0.021, 0.018, 0.012, 1)), n=8)
    return {"head": [h, q, rb], "chest": []}


def hair_b(v, H, C, back_y=None):
    seq = [(0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (4, -1), (3, -1), (2, -1), (1, -1)]
    zb = {0: 0.052, 1: 0.03, 2: -0.055, 3: -0.065, 4: -0.07, 5: -0.075}   # high in the middle, locks down the sides
    NR = 4

    def point(ci, ri):
        j, s = seq[ci]
        t = ri / (NR - 1)
        z = 0.082 + (zb[j] - 0.082) * t
        q = H.surf(j, z, 0.005 + (0.012 if j in (2, 3) else 0.007) * t, s)
        if ri == NR - 1:
            q.z += random.Random(ci).uniform(-0.012, 0.004)
        return q

    h = head_grid(f"hair_{v}", H, len(seq), NR, point, C, "hair-dark", 0.009, closed=True)
    P = H.P
    fringe = tri_mesh(f"fringe_{v}", [P(-0.04, -0.07, 0.07), P(0.01, -0.078, 0.066), P(0.05, -0.07, 0.036), P(0.03, -0.077, 0.04), P(-0.01, -0.079, 0.05)],
                      [(0, 1, 4), (1, 3, 4), (1, 2, 3)], C, "hair-dark", 0.008)
    head_parts, chest_parts = [h, fringe], []
    p = P(0, 0.074, -0.05)
    for i in range(6):
        r = 0.024 - 0.0022 * i
        if back_y and i >= 1:                          # lie on the coat's back, not inside it
            p.y = max(p.y, back_y(p.z) + r * 0.7)
        o = prim(f"braid{i}_{v}", "ico", C, "hair-dark", TRS(p, rot=(15, 0, 0), scale=(r, r * 0.75, r * 1.25)), sub=1)
        (head_parts if i < 2 else chest_parts).append(o)
        p = p + Vector((0, 0.008 - 0.002 * i, -0.04))
    chest_parts.append(prim(f"braidtie_{v}", "cyl", C, "oxblood", TRS(p + Vector((0, 0, 0.022)), scale=(0.013, 0.011, 0.01)), n=8))
    chest_parts.append(prim(f"braidend_{v}", "cone", C, "hair-dark", TRS(p, scale=(1, 0.8, 0.03)), n=6, r1=0.004, r2=0.012))
    return {"head": head_parts, "chest": chest_parts}


def hat(v, H, C, seat, tilt=-4.0):
    prof = H.profile(seat)
    s = H.s
    xw = max(x for x, _ in prof) * s + 0.006
    yf, yb = prof[0][1] * s, prof[5][1] * s
    ry = (yb - yf) / 2 + 0.006
    yo = (yb + yf) / 2 + H.loc.y
    zs = H.loc.z + seat * s
    N = 24

    def brim(a, extra=0.0):
        corner = max(math.cos(3 * (a + math.pi / 2)), 0) ** 3
        rx, ry2 = xw * math.cos(a), ry * math.sin(a)
        base = math.hypot(rx, ry2)
        out = base + 0.042 + 0.05 * corner + extra
        return Vector((out * math.cos(a), out * math.sin(a), 0.052 * (1 - corner) + 0.01))

    bm = bmesh.new()
    inner = [bm.verts.new((xw * math.cos(2 * math.pi * i / N - math.pi / 2), ry * math.sin(2 * math.pi * i / N - math.pi / 2), 0)) for i in range(N)]
    outer = [bm.verts.new(brim(2 * math.pi * i / N - math.pi / 2)) for i in range(N)]
    for i in range(N):
        j = (i + 1) % N
        bm.faces.new((inner[i], inner[j], outer[j], outer[i]))
    rows = [inner]
    for z, k in ((0.045, 0.97), (0.068, 0.84)):
        rows.append([bm.verts.new((v_.co.x * k, v_.co.y * k, z)) for v_ in inner])
    for a, b in zip(rows, rows[1:]):
        for i in range(N):
            j = (i + 1) % N
            bm.faces.new((a[i], a[j], b[j], b[i]))
    top = bm.verts.new((0, 0, 0.076))
    for i in range(N):
        bm.faces.new((rows[-1][i], rows[-1][(i + 1) % N], top))
    M = Matrix.Translation((0, yo, zs)) @ Matrix.Rotation(math.radians(tilt), 4, "X")
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    h = bpy.data.meshes.new(f"hat_{v}")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(h)
    bm.free()
    ho = bpy.data.objects.new(f"hat_{v}", h)
    C.objects.link(ho)
    h.materials.append(mat("charcoal"))
    solidify(ho, 0.007)
    bm = bmesh.new()
    top_r = [bm.verts.new(brim(2 * math.pi * i / N - math.pi / 2, 0.003) + Vector((0, 0, 0.004))) for i in range(N)]
    bot_r = [bm.verts.new(brim(2 * math.pi * i / N - math.pi / 2, 0.003) + Vector((0, 0, -0.008))) for i in range(N)]
    for i in range(N):
        j = (i + 1) % N
        bm.faces.new((bot_r[i], bot_r[j], top_r[j], top_r[i]))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    tm = bpy.data.meshes.new(f"hattrim_{v}")
    bm.to_mesh(tm)
    bm.free()
    to = bpy.data.objects.new(f"hattrim_{v}", tm)
    C.objects.link(to)
    tm.materials.append(mat("brass"))
    solidify(to, 0.005)
    a = -math.pi / 2 + math.radians(48)
    p = brim(a) * 0.82
    p.z = 0.045
    ck = prim(f"cockade_{v}", "cyl", C, "player", M @ along(p, (math.cos(a), math.sin(a), 0.35)) @ Matrix.Diagonal((0.022, 0.022, 0.01, 1)), n=10)
    return [ho, to, ck]


def coat_rings(body, wc_fit, k=1.0):
    spec = [(0.25, 0.19, 0.152, 0.75, 0.012), (0.37, 0.166, 0.132, 0.6), (0.47, 0.146, 0.12, 0.48), (0.55, 0.137, 0.112, 0.4),
            (0.62, 0.143, 0.114, 0.38), (0.70, 0.158, 0.12, 0.4), (0.772, 0.178, 0.104, 0.5), (0.80, 0.074, 0.068, 0.75)]
    rings = []
    for z, rx, ry, op, *jag in spec:
        if z >= 0.55:
            rx, ry = rx * k, ry * (0.5 + 0.5 * k)
        if z < 0.79:
            bx, by, yo = wc_fit(z)
            rx, ry = max(rx, bx + 0.02), max(ry, by + 0.02)
        else:
            yo = 0.01
        rings.append((z, rx, ry, yo, op) + tuple(jag))
    return rings


def edge_strip(name, rings, a_from, a_to, C, material, out=0.005, zmin=0.0, zmax=2.0):
    objs = []
    for side in (1, -1):
        bm = bmesh.new()
        R = []
        for z, rx, ry, yo, op, *_ in rings:
            if not (zmin <= z <= zmax):
                continue
            row = []
            for a in (op + a_from(z), op + a_to(z)):
                aa = a if side > 0 else 2 * math.pi - a
                row.append(bm.verts.new(((rx + out) * math.sin(aa), -(ry + out) * math.cos(aa) + yo, z)))
            R.append(row)
        for a, b in zip(R, R[1:]):
            bm.faces.new((a[0], a[1], b[1], b[0]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(f"{name}{side}")
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(f"{name}{side}", me)
        C.objects.link(o)
        me.materials.append(mat(material))
        orient_out(o, (0, 0, None))
        objs.append(solidify(o, 0.004))
    return objs


def outfit(v, cfg, body, J, C):
    fem = cfg["fem"]
    groups = {"transfer": [], "skirt": [], "hips": [], "neck": [], "chest": [], "hand.L": [], "hand.R": [], "forearm.L": [], "forearm.R": []}

    def wc_fit(z):
        bx, by, yo = extent(body, z)
        return bx + 0.006, by + 0.006, yo

    # waistcoat (buff), pointed at the front bottom
    wc_r = [(z, *wc_fit(z), 0.0) for z in (0.47, 0.55, 0.63, 0.71, 0.758)]
    nx, ny, nyo = extent(body, 0.805, 0.012, 0.08)
    wc_r.append((0.8, nx + 0.004, ny + 0.004, nyo, 0.0))     # closes onto the neck: no gap into the torso
    wc = shell(f"waistcoat_{v}", wc_r, 16, C, "leather-light", 0.006, close=True)
    for p in wc.data.vertices:
        if p.co.z < 0.5 and p.co.y < -0.05:
            p.co.z -= 0.03 * (1 - min(1, abs(p.co.x) / 0.06))
    delete_faces(wc, lambda c, f: c.y > -0.045)      # only the front shows; sides and back stay under the coat
    groups["transfer"].append(wc)
    groups["skirt"].append(wc)
    for i, z in enumerate((0.5, 0.56, 0.62, 0.68, 0.74)):
        bx, by, yo = wc_fit(z)
        groups["transfer"].append(prim(f"wcbtn{i}_{v}", "ico", C, "brass", TRS((0, yo - by - 0.006, z), scale=(0.006, 0.004, 0.006)), sub=1))
    # coat, trims, lapels, hem, pockets
    rings = coat_rings(body, wc_fit, 0.86 if fem else 1.0)
    coat = shell(f"coat_{v}", rings, 18, C, "navy", 0.008)
    trim = edge_strip(f"trim_{v}", rings[:-1], lambda z: 0.0, lambda z: 0.07, C, "brass", out=0.006)
    lapel = edge_strip(f"lapel_{v}", rings, lambda z: 0.02, lambda z: 0.36 * max(0, (z - 0.6) / 0.17) + 0.05, C, "oxblood", out=0.009, zmin=0.6)
    z0, rx0, ry0, yo0, op0 = rings[0][:5]
    hem = shell(f"hemtrim_{v}", [(z0 - 0.004, rx0 + 0.006, ry0 + 0.006, yo0, op0), (z0 + 0.02, rx0 - 0.002, ry0 - 0.002, yo0, op0)], 18, C, "brass", 0.004)
    zp = 0.44
    rx_p = rings[1][1] + (rings[2][1] - rings[1][1]) * (zp - 0.37) / 0.1
    ry_p = rings[1][2] + (rings[2][2] - rings[1][2]) * (zp - 0.37) / 0.1
    pockets = []
    for s in (1, -1):
        pts = []
        for a, z in ((0.75, 0.462), (1.25, 0.462), (1.25, 0.432), (1.0, 0.424), (0.75, 0.432)):
            aa = a if s > 0 else 2 * math.pi - a
            pts.append(((rx_p + 0.011) * math.sin(aa), -(ry_p + 0.011) * math.cos(aa) + rings[2][3], z))
        fl = tri_mesh(f"pocket{s}_{v}", pts, [(0, 1, 2, 3, 4)], C, "navy", 0.005)
        orient_out(fl, (0, 0, None))
        aa = 1.0 if s > 0 else 2 * math.pi - 1.0
        bt = prim(f"pocketbtn{s}_{v}", "ico", C, "brass", TRS(((rx_p + 0.018) * math.sin(aa), -(ry_p + 0.018) * math.cos(aa) + rings[2][3], 0.432), scale=(0.006,) * 3), sub=1)
        pockets += [fl, bt]
    btns = []
    for i, (z, rx, ry, yo, op, *_) in enumerate(rings[2:6]):
        for s in (1, -1):
            a = op + 0.13
            btns.append(prim(f"cbtn{i}{s}_{v}", "ico", C, "brass", TRS((s * (rx + 0.009) * math.sin(a), -(ry + 0.009) * math.cos(a) + yo, z), scale=(0.007, 0.005, 0.007)), sub=1))
    for o in [coat, hem] + trim + lapel + pockets + btns:
        groups["transfer"].append(o)
        groups["skirt"].append(o)
    # collar and cravat
    groups["neck"].append(shell(f"collar_{v}", [(0.785, 0.092, 0.082, 0.012, 1.25), (0.842, 0.102, 0.092, 0.02, 1.15)], 10, C, "navy", 0.006))
    bx, by, yo = wc_fit(0.75)
    fy = yo - by - 0.008                              # just in front of the waistcoat at the neckline
    cr = [(0, 0.02, 0.79), (0.024, 0.018, 0.783), (-0.024, 0.018, 0.783), (0.018, -0.004, 0.752), (-0.018, -0.004, 0.752),
          (0, -0.008, 0.74), (0.02, -0.008, 0.748), (-0.02, -0.008, 0.748), (0, -0.012, 0.715)]
    groups["chest"].append(tri_mesh(f"cravat_{v}", [(x, fy + y, z) for x, y, z in cr],
                                    [(0, 1, 3, 5), (0, 5, 4, 2), (5, 6, 8), (5, 8, 7)], C, "linen", 0.006))
    # sash over the coat with a bow and two tails on the left hip
    cx, cy, cyo = extent(coat, 0.54, 0.04)
    cfg["hip_x"] = cx + 0.015
    sash = shell(f"sash_{v}", [(0.522, cx + 0.004, cy + 0.004, cyo, 0), (0.548, cx + 0.009, cy + 0.008, cyo, 0), (0.578, cx + 0.004, cy + 0.004, cyo, 0)], 16, C, "player", 0.006, close=True)
    groups["transfer"].append(sash)
    ang = 0.8
    kx, ky, kz = (cx + 0.012) * math.sin(ang), -(cy + 0.012) * math.cos(ang) + cyo, 0.55
    face_rot = math.degrees(ang)          # bow faces outward from the hip
    for s2 in (1, -1):
        groups["hips"].append(prim(f"bow{s2}_{v}", "ico", C, "player",
                                   TRS((kx, ky, kz), rot=(0, 0, face_rot)) @ TRS((s2 * 0.022, -0.004, 0.003), rot=(0, s2 * 25, 0), scale=(0.024, 0.01, 0.016)), sub=1))
    groups["hips"].append(prim(f"bowknot_{v}", "ico", C, "player", TRS((kx, ky, kz), rot=(0, 0, face_rot)) @ TRS((0, -0.008, 0), scale=(0.012, 0.01, 0.013)), sub=1))
    for i, (dx, ln, w) in enumerate(((0.008, 0.15, 0.034), (-0.012, 0.115, 0.03))):
        bm = bmesh.new()
        rows = []
        for k in range(4):
            t = k / 3
            z = kz - 0.012 - ln * t
            ww = w * (1 - 0.25 * t)
            x = kx + dx + 0.01 * t * (1 if dx > 0 else -1)
            y = ky - 0.006 - 0.004 * t
            rows.append((bm.verts.new((x - ww / 2, y, z + (0.01 if k == 3 and dx > 0 else 0))), bm.verts.new((x + ww / 2, y, z - (0.012 if k == 3 else 0)))))
        for a, b in zip(rows, rows[1:]):
            bm.faces.new((a[0], a[1], b[1], b[0]))
        me = bpy.data.meshes.new(f"tail{i}_{v}")
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(f"tail{i}_{v}", me)
        C.objects.link(o)
        me.materials.append(mat("player"))
        groups["hips"].append(solidify(o, 0.005))
    # sleeves, cuffs, fists
    a = 0.85 if fem else 1.0
    for s, L in ((1, "L"), (-1, "R")):
        sh, el, wr = Vector(J["shoulder" + L]), Vector(J["elbow" + L]), Vector(J["wrist" + L])
        end = el + (wr - el) * 0.78
        sl = skin_mesh(f"sleeve{s}_{v}", [("sh", tuple(sh), (0.066 * a, 0.064 * a)), ("el", tuple(el), (0.052 * a, 0.052 * a)), ("end", tuple(end), (0.046 * a, 0.046 * a))],
                       [("sh", "el"), ("el", "end")], C, "sh", sub=1, decimate=0.6)
        sl.data.materials.append(mat("navy"))
        groups["transfer"].append(sl)
        d = (wr - el).normalized()
        groups["forearm." + L].append(prim(f"cuff{s}_{v}", "cone", C, "oxblood", along(el + (wr - el) * 0.68, -d) @ Matrix.Diagonal((1, 1, 0.07, 1)), n=8, r1=0.05 * a, r2=0.062 * a))
        side = Vector((s, 0, 0)).cross(d).normalized()
        groups["forearm." + L].append(prim(f"cuffbtn{s}_{v}", "ico", C, "brass", TRS(el + (wr - el) * 0.68 + Vector((0, -0.062 * a, 0)), scale=(0.007,) * 3), sub=1))
        hd = (wr - el).normalized()
        Mb = along(wr + hd * 0.045, -hd) @ Matrix.Rotation(math.pi, 4, "Z")
        groups["hand." + L].append(prim(f"fist{s}_{v}", "ico", C, cfg["skin"], Mb @ Matrix.Diagonal((0.026 * a, 0.038 * a, 0.042 * a, 1)), sub=1))
        groups["hand." + L].append(prim(f"thumb{s}_{v}", "ico", C, cfg["skin"], Mb @ TRS((-s * 0.006, -0.03 * a, 0.008), rot=(-25, 0, 0), scale=(0.015 * a, 0.015 * a, 0.024 * a)), sub=1))
    # boots: leg, sole, flared cuff with a lighter turned-down band
    for s, L in ((1, "L"), (-1, "R")):
        kn, an, to = Vector(J["knee" + L]), Vector(J["ankle" + L]), Vector(J["toe" + L])
        spec = [("knee", tuple(kn + Vector((0, 0, 0.03))), (0.058, 0.06)), ("calf", (kn.x, 0.01, 0.18), (0.056, 0.058)), ("ankle", tuple(an + Vector((0, 0, 0.005))), (0.045, 0.05)),
                ("toe", tuple(to + Vector((0, -0.01, 0.003))), (0.046, 0.03)), ("heel", (an.x, 0.035, 0.025), (0.04, 0.03))]
        b = skin_mesh(f"boot{s}_{v}", spec, [("knee", "calf"), ("calf", "ankle"), ("ankle", "toe"), ("ankle", "heel")], C, "knee", sub=1, decimate=0.5)
        b.data.materials.append(mat("leather-dark"))
        sole = prim(f"sole{s}_{v}", "cube", C, "charcoal", TRS((an.x, -0.02, 0.005), scale=(0.058, 0.125, 0.01)))
        cuff = shell(f"bootcuff{s}_{v}", [(0.255, 0.062, 0.068, 0, 0), (0.305, 0.07, 0.076, 0, 0)], 10, C, "leather-dark", 0.006, close=True)
        band = shell(f"bootband{s}_{v}", [(0.293, 0.073, 0.079, 0, 0), (0.311, 0.073, 0.079, 0, 0)], 10, C, "leather-light", 0.005, close=True)
        for o in (cuff, band):
            o.data.transform(Matrix.Translation((kn.x, 0, 0)))
        groups["transfer"] += [b, sole, cuff, band]
    return groups


def build(v):
    cfg = VARIANTS[v]
    C = coll(f"captain_{v}", clear=True)
    body, J = build_body(f"body_{v}", C, cfg["fem"])
    H = Head(cfg["head"], cfg["head_loc"], cfg["head_scale"])
    fparts = face(v, cfg, H, C)
    groups = outfit(v, cfg, body, J, C)
    coat = bpy.data.objects[f"coat_{v}"]

    def back_y(z):
        rx, ry, yo = extent(coat, z, 0.03)
        return yo + ry + 0.006
    hparts = hair_b(v, H, C, back_y) if cfg["fem"] else hair_a(v, H, C)
    head_objs = fparts["head"] + hparts["head"] + hat(v, H, C, cfg["seat"])
    if not cfg["fem"]:
        head_objs += beard(v, H, C)
    groups["chest"] += hparts["chest"]
    spy = []
    for i, (z, r, l) in enumerate(((0.0, 0.024, 0.11), (0.1, 0.019, 0.1), (0.185, 0.0155, 0.08))):
        spy.append(prim(f"spy{i}_{v}", "cyl", C, "brass", TRS((0, 0, z), scale=(r, r, l)), n=10))
    spy.append(prim(f"spygrip_{v}", "cyl", C, "leather-dark", TRS((0, 0, 0), scale=(0.0255, 0.0255, 0.05)), n=10))
    spy.append(prim(f"spylens_{v}", "cyl", C, "hair-dark", TRS((0, 0, 0.226), scale=(0.013, 0.013, 0.004)), n=10))
    spyglass = join(spy, f"spyglass_{v}")
    # body colours: skin at the neck, breeches below; then rig and weights
    me = body.data
    me.materials.clear()
    for n in (cfg["skin"], "charcoal"):
        me.materials.append(mat(n))
    for p in me.polygons:
        p.material_index = 0 if p.center.z > 0.74 else 1
    rig = build_rig(f"rig_{v}", J, C, H.top_z())
    auto_weights(body, rig)
    for o in head_objs:
        rigid(o, "head")
    for g in ("neck", "chest", "hips", "hand.L", "hand.R", "forearm.L", "forearm.R"):
        for o in groups[g]:
            rigid(o, g)
    for o in groups["transfer"]:
        transfer(o, body)
    for o in groups["skirt"]:
        skirt(o, top=0.5, blend=0.1)
    # nothing hidden under clothes survives, so nothing can poke through
    def hidden(c, f):
        return (c.z < 0.3                                  # inside the boots
                or 0.47 <= c.z < 0.74                      # under the waistcoat (the neckline above stays as skin)
                or (abs(c.x) > 0.12 and c.z > 0.42)        # arms: sleeves and fists replace them
                or (c.z >= 0.79 and abs(c.x) > 0.06))      # shoulder tops under the coat
    delete_faces(body, hidden)
    for m in list(body.modifiers):
        body.modifiers.remove(m)
    allobjs = [body] + head_objs + [o for g in groups.values() for o in g]
    seen, uniq = set(), []
    for o in allobjs:
        if o.name not in seen:
            seen.add(o.name)
            uniq.append(o)
    mesh = join(uniq, f"captain_{v}")
    mesh.parent = rig
    mesh.matrix_parent_inverse.identity()
    mesh.modifiers.new("Armature", "ARMATURE").object = rig
    # pose
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    turn(rig, "hips", (0, 1, 0), 4)
    turn(rig, "hips", (0, 0, 1), -6)
    turn(rig, "spine", (0, 1, 0), -3)
    turn(rig, "chest", (0, 1, 0), -2)
    turn(rig, "chest", (0, 0, 1), 8)
    turn(rig, "neck", (0, 0, 1), 6)
    turn(rig, "head", (0, 0, 1), 8)
    turn(rig, "head", (1, 0, 0), -4)
    aim(rig, "thigh.L", (0.1, -0.05, -0.99))
    aim(rig, "shin.L", (0.04, 0.04, -1))
    aim(rig, "foot.L", (0.25, -1, -0.35))
    aim(rig, "thigh.R", (-0.08, 0.02, -1))
    aim(rig, "shin.R", (-0.02, 0.03, -1))
    aim(rig, "foot.R", (-0.3, -1, -0.35))
    reach(rig, "L", (cfg["hip_x"] + 0.03, 0.012, 0.585), (0.6, 0.45, 0.68), (-0.35, -0.12, -0.93))
    reach(rig, "R", (-0.19, -0.17, 0.64), (-0.4, 0.35, 0.4), (-0.05, -0.9, 0.42))
    pb = rig.pose.bones["hand.R"]
    bpy.context.view_layer.update()
    grip = pb.head + (pb.tail - pb.head).normalized() * 0.04
    place_on_bone(spyglass, rig, "hand.R", along(grip, (-0.3, -0.72, 0.62)) @ Matrix.Translation((0, 0, -0.03)))
    mesh = join([mesh, spyglass], f"captain_{v}")
    ground(rig, mesh)
    bake_idle(rig)
    rig.location.x = cfg["x"]
    print(v, "tris", tris(mesh))
    return rig, mesh


def review(variants=("a", "b"), full=512, portrait=384):
    """Render each variant alone at the origin with the preview cameras."""
    rigs = {v: bpy.data.objects[f"rig_{v}"] for v in VARIANTS}
    for v in variants:
        for k, r in rigs.items():
            r.location.x = 0 if k == v else 50
        bpy.context.view_layer.update()
        charlib.render(FOLDER, v, full=full, portrait=portrait)
    for k, r in rigs.items():
        r.location.x = VARIANTS[k]["x"]


# start clean: keep only the preview rig and materials
for o in list(bpy.data.objects):
    if o.name not in ("cam_full", "cam_portrait", "key", "rim", "fill"):
        bpy.data.objects.remove(o, do_unlink=True)
for c in list(bpy.data.collections):
    if c.name != "preview":
        bpy.data.collections.remove(c)
for block in (bpy.data.meshes, bpy.data.armatures, bpy.data.actions):
    for d in list(block):
        if d.users == 0 or block is bpy.data.actions:
            block.remove(d)
RESULT = {v: build(v) for v in VARIANTS}
bpy.context.scene.frame_set(1)
