import sys
import pickle
if len(sys.argv) != 3:
    print("Usage: python3 unyeeter.py <old file> <destination>")
    exit()

w = pickle.load(open(sys.argv[1], "rb"))

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
pickle.dump(w, open(sys.argv[2], "wb"))
