# Defines the heptagonal {7, 3}-tiling of hyperbolic space.
# To represent the tiling and adjacency, as tree structure is used. The tree structer has three
# type of nodes:
#    Origin node: has 7 children, all major nodes
#    Major node: has one minor node and two major nodes as children
#    Minor node: has one minor and one major node as children
# Starting with one origin node and following that structure gives the structure of the tiling
# A child may be uninitialized, stored as None. When the child is request in some way, it is to be
# generated.

# We also include a Stop node, representing the end of the map.

# All nodes also store a cache of all the surrounding nodes. These are non-owning references and are
# only for speeding up computations. The may be None, but are assigned every time a neighbour of a
# node is requested.

# Neighbours of a tile are indexed starting with the parent node at index 0, continuing
# counter-clockwise. The origin has index 0 pointing upwards

from abc import ABC, abstractmethod
from copy import deepcopy
from tiledata import TileData
import pickle

TILE_CTR = 0


class TileGenerationContext:
    def __init__(self, n_steps_out):
        self.n_steps_out = n_steps_out

class Tile(ABC):
    def __init__(self, gctx):
        global TILE_CTR
        self.gctx = gctx
        self.cache = [None for _ in range(7)]
        self.idx = TILE_CTR
        TILE_CTR += 1
        self.assoc_data = TileData()

    # Don't pickle the cache!
    def __getstate__(self):
        state = self.__dict__.copy()
        # Don't pickle baz
        del state["cache"]
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)
        # Add baz back since it doesn't exist in the pickle
        self.cache = [(None, None) for _ in range(7)]

    def get_all_chilren_and_data(self):
        out = []
        for i, ch in enumerate(self.children):
            if ch == None:
                out.append(None)
            else:
                out.append((ch.assoc_data, ch.get_all_chilren_and_data()))
        return out

    def get_child_with_idx(self, idx):
        if self.idx == idx:
            return self

        for ch in self.children:
            if ch is None:
                continue
            chid = ch.get_child_with_idx(idx)
            if chid is not None:
                return chid

        return None

    def __str__(self):
        return f"{type(self).__name__}({self.idx})"

    __repr__ = __str__

    # Caches the result
    def get_neighbour(self, i):
        i %= 7
        if self.cache[i] == (None, None):
            return self.cache[i]
        else:
            n = self.get_neighbour_impl(i)
            self.cache[i] = n
            return n

    # Does not cache the result
    # Gives a tuple (node, edge number) where node is the neighoubring node, and edge is the edge
    # that the neighbour connects with
    @abstractmethod
    def get_neighbour_impl(self, i):
        pass

    def is_available(self):
        return self.gctx.n_steps_out <= 4

class OriginNode(Tile):
    def __init__(self, gctx):
        super(OriginNode, self).__init__(gctx)

        self.children = [None for _ in range(7)]

    def get_neighbour_impl(self, i):
        if self.children[i] is None:
            gctx = deepcopy(self.gctx)
            gctx.n_steps_out += 1

            self.children[i] = MajorNode(gctx, self, i)

        return self.children[i], 0

class MajorNode(Tile):
    def __init__(self, gctx, parent, parent_idx):
        super(MajorNode, self).__init__(gctx)

        self.children = [None for _ in range(3)]

        self.parent = parent
        self.parent_idx = parent_idx

    def get_neighbour_impl(self, i):
        if i == 0:
            return self.parent, self.parent_idx

        if 2 <= i <= 4:
            c = i - 2
            if self.children[c] is None:
                gctx = deepcopy(self.gctx)
                gctx.n_steps_out += 1

                if i == 2:
                    child = MinorNode(gctx, self, i)
                else:
                    child = MajorNode(gctx, self, i)

                self.children[c] = child
            return self.children[c], 0

        if i == 1:
            n, e = self.parent.get_neighbour(self.parent_idx - 1)
            return n, (e - 1) % 7

        if i == 5:
            neighbour_parent = self.get_neighbour(6)[0]
            if isinstance(neighbour_parent, MajorNode):
                n = neighbour_parent.get_neighbour(2)[0]
                return n, 1
            else:
                n = neighbour_parent.get_neighbour(3)[0]
                assert(isinstance(n, MinorNode))
                return n, 1

        if i == 6:
            n, e = self.parent.get_neighbour(self.parent_idx + 1)
            return n, (e + 1) % 7


class MinorNode(Tile):
    def __init__(self, gctx, parent, parent_idx):
        super(MinorNode, self).__init__(gctx)

        self.children = [None for _ in range(2)]

        self.parent = parent
        self.parent_idx = parent_idx

    def get_neighbour_impl(self, i):
        if i == 0:
            return self.parent, self.parent_idx

        if 3 <= i <= 4:
            c = i - 3
            if self.children[c] is None:
                gctx = deepcopy(self.gctx)
                gctx.n_steps_out += 1

                if i == 3:
                    child = MinorNode(gctx, self, i)
                else:
                    child = MajorNode(gctx, self, i)

                self.children[c] = child

            return self.children[c], 0

        if i == 1:
            n, e = self.parent.get_neighbour(self.parent_idx - 1)
            return n, (e - 1) % 7

        if i == 2:
            neighbour_parent = self.get_neighbour(1)[0]
            return neighbour_parent.get_neighbour(4)[0], 6

        if i == 5:
            neighbour_parent = self.get_neighbour(6)[0]
            if isinstance(neighbour_parent, MajorNode):
                return neighbour_parent.get_neighbour(2)[0], 1
            else:
                return neighbour_parent.get_neighbour(3)[0], 1

        if i == 6:
            n, e = self.parent.get_neighbour(self.parent_idx + 1)
            return n, (e + 1) % 7

class NodeView:
    def __init__(self, node, orientation):
        # Represents this node, but artifically parented at edge orientation
        self.node = node
        self.orientation = orientation

    def get_neighbour(self, idx):
        real_idx = self.orientation + idx
        node, orientation = self.node.get_neighbour(real_idx)
        return NodeView(node, orientation)

    def __str__(self):
        return f'NodeView(orientation={self.orientation},node={self.node})'

if __name__ == "__main__":
    n = OriginNode(TileGenerationContext(0))
    v = NodeView(n, 0)
    print(v.get_neighbour(2).get_neighbour(1).get_neighbour(1))
