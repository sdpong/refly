import { useCallback } from 'react';
import { useCanvasStore } from '../../../stores/canvas';
import { useCanvasId } from '@refly-packages/ai-workspace-common/hooks/canvas/use-canvas-id';
import { useNodeOperations } from '@refly-packages/ai-workspace-common/hooks/canvas/use-node-operations';
import { calculateGroupBoundaries, sortNodes, getAbsolutePosition } from './utils';
import { useUngroupNodes } from './use-ungroup-nodes';
import { prepareNodeData } from '../../../components/canvas/nodes';
import { genUniqueId } from '@refly-packages/utils/id';

export const useGroupNodes = () => {
  const canvasId = useCanvasId();
  const { updateNodesWithSync } = useNodeOperations(canvasId);
  const { ungroupNodes } = useUngroupNodes();

  const createGroupFromSelectedNodes = useCallback(() => {
    const { data } = useCanvasStore.getState();
    const beforeNodes = data[canvasId]?.nodes ?? [];
    const selectedNodes = beforeNodes.filter((n) => n.selected);

    if (selectedNodes.length < 2) return;

    // Calculate group boundaries and create group node
    const { groupNode } = calculateGroupBoundaries(selectedNodes, beforeNodes);

    // Prepare the new group node
    const newGroupNode = prepareNodeData({
      ...groupNode,
      data: {
        ...groupNode.data,
        entityId: genUniqueId(),
      },
    });

    // Track groups that will become empty
    const emptyGroups = new Set<string>();
    const groupChildCounts = new Map<string, number>();

    // Count children in each group
    beforeNodes.forEach((node) => {
      if (node.parentId) {
        groupChildCounts.set(node.parentId, (groupChildCounts.get(node.parentId) || 0) + 1);
      }
    });

    // Update nodes
    let updatedNodes = beforeNodes.map((node) => {
      if (node.selected) {
        // Calculate absolute position for the node
        const absolutePos = getAbsolutePosition(node, beforeNodes);

        // Check if current group will become empty
        if (node.parentId) {
          const selectedSiblingsCount = selectedNodes.filter(
            (n) => n.parentId === node.parentId,
          ).length;

          if (selectedSiblingsCount === groupChildCounts.get(node.parentId)) {
            emptyGroups.add(node.parentId);
          }
        }

        return {
          ...node,
          parentId: newGroupNode.id,
          extent: 'parent' as const,
          position: {
            x: absolutePos.x - newGroupNode.position.x,
            y: absolutePos.y - newGroupNode.position.y,
          },
          selected: false,
          draggable: true,
        };
      }
      return node;
    });

    // Add the new group node
    updatedNodes = [...updatedNodes, newGroupNode];

    // Remove empty groups
    updatedNodes = updatedNodes.filter((node) => !emptyGroups.has(node.id));

    // Update the canvas with sorted nodes
    updateNodesWithSync(sortNodes(updatedNodes));
  }, [canvasId, updateNodesWithSync]);

  return {
    createGroupFromSelectedNodes,
  };
};
