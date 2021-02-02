import sys
import pickle

from hypertiling import Tile

if len(sys.argv) != 4:
    print("Usage: python3 upgrader.py <action> <old file> <destination>")
    exit()


_, action, old, new = sys.argv

if old == new:
    print("This action will override the new file. Type `yes' to continue")
    if input("> ").strip().lower() != "yes":
        exit()

w = pickle.load(open(sys.argv[2], "rb"))

def map_inplace(fn, node):
    fn(node)
    for ch in node.children:
        if ch is not None:
            map_inplace(fn, ch)

def map_data(fn, node):
    node.assoc_data = fn(node.assoc_data)
    for i in range(len(node.children)):
        if node.children[i] is not None:
            node.children[i] = map_data(fn, node.children[i])

    return node

if action == "regen-nature":
    print("Regenerating nature")
    map_inplace(Tile.generate_nature, w)
    print("Regenerated nature")

if action == "unyeet":
    print("Starting unyeeting")

    seen = set()
    idx = 0

    def count_nodes(node):
        count = 1
        for ch in node.children:
            if ch != None:
                count += count_nodes(ch)
        return count

    count = count_nodes(w)

    def reidx(node, depth):
        global idx, seen
        if depth < 0:
            return 0, 0
        count = 0
        reached = depth == 0
        if node.idx in seen and depth == 0:
            count += 1
            while idx in seen:
                idx += 1
            node.idx = idx
        seen.add(node.idx)
        for ch in node.children:
            if ch is not None:
                count_, reached_ = reidx(ch, depth-1)
                count += count_
                reached += reached_
        return count, reached

    total_so_far = 0
    d = 0
    while True:
        c, r = reidx(w, d)
        total_so_far += r
        print(f"d = {d}, {int(total_so_far / count * 100 * 100) / 100}% done, {r} nodes unyeeted")
        if r == 0:
            break
        d += 1

print("Done")
pickle.dump(w, open(sys.argv[3], "wb"))
