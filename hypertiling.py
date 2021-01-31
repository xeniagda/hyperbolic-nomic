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

    def __str__(self):
        return f"{type(self).__name__}({self.idx})"

    __repr__ = __str__

    # Caches the result
    def get_neighbour(self, i, generate=True):
        i %= 7
        if self.cache[i] is not None:
            return self.cache[i]
        else:
            n = self.get_neighbour_impl(i, generate)
            self.cache[i] = n
            return n

    # Does not cache the result
    @abstractmethod
    def get_neighbour_impl(self, i, generate=True):
        pass

    def is_available(self):
        return self.gctx.n_steps_out <= 4

class OriginNode(Tile):
    def __init__(self, gctx):
        super(OriginNode, self).__init__(gctx)

        self.children = [None for _ in range(7)]

    def get_neighbour_impl(self, i, generate=True):
        if self.children[i] is None and generate:
            gctx = deepcopy(self.gctx)
            gctx.n_steps_out += 1

            self.children[i] = MajorNode(gctx, self, i)

        return self.children[i]

class MajorNode(Tile):
    def __init__(self, gctx, parent, parent_idx):
        super(MajorNode, self).__init__(gctx)

        self.children = [None for _ in range(3)]

        self.parent = parent
        self.parent_idx = parent_idx

    def get_neighbour_impl(self, i, generate=True):
        if i == 0:
            return self.parent

        if 2 <= i <= 4:
            c = i - 2
            if self.children[c] is None and generate:
                gctx = deepcopy(self.gctx)
                gctx.n_steps_out += 1

                if i == 2:
                    child = MinorNode(gctx, self, i)
                else:
                    child = MajorNode(gctx, self, i)

                self.children[c] = child
            return self.children[c]

        if i == 1:
            return self.parent.get_neighbour(self.parent_idx - 1, generate)

        if i == 5:
            neighbour_parent = self.get_neighbour(6, generate)
            if isinstance(neighbour_parent, MajorNode):
                return neighbour_parent.get_neighbour(2, generate)
            else:
                return neighbour_parent.get_neighbour(3, generate)

        if i == 6:
            return self.parent.get_neighbour(self.parent_idx + 1, generate)


class MinorNode(Tile):
    def __init__(self, gctx, parent, parent_idx):
        super(MinorNode, self).__init__(gctx)

        self.children = [None for _ in range(2)]

        self.parent = parent
        self.parent_idx = parent_idx

    def get_neighbour_impl(self, i, generate=True):
        if i == 0:
            return self.parent

        if 3 <= i <= 4:
            c = i - 3
            if self.children[c] is None and generate:
                gctx = deepcopy(self.gctx)
                gctx.n_steps_out += 1

                if i == 3:
                    child = MinorNode(gctx, self, i)
                else:
                    child = MajorNode(gctx, self, i)

                self.children[c] = child

            return self.children[c]

        if i == 1:
            return self.parent.get_neighbour(self.parent_idx - 1, generate)

        if i == 2:
            neighbour_parent = self.get_neighbour(1, generate)
            return neighbour_parent.get_neighbour(4, generate)

        if i == 5:
            neighbour_parent = self.get_neighbour(6, generate)
            if isinstance(neighbour_parent, MajorNode):
                return neighbour_parent.get_neighbour(2, generate)
            else:
                return neighbour_parent.get_neighbour(3, generate)

        if i == 6:
            return self.parent.get_neighbour(self.parent_idx + 1, generate)



