import { useState, useMemo, useCallback, ReactNode, memo } from 'react';
import TreeNode from './TreeNode';

export type TreeNode = {
  id: string;
  labelNode: ReactNode;
  showArrow?: boolean;
  children?: TreeNode[];
};

export type FlattenedTreeNode = {
  id: string;
  labelNode: ReactNode;
  showArrow?: boolean;
  hasChildren: boolean;
  depth: number;
  collapsed: boolean;
};

type Props = {
  data: TreeNode[];
  className?: string;
  collapseAll?: boolean;
};

function Tree(props: Props) {
  const { data, className, collapseAll = false } = props;
  const [closedNodeIds, setClosedNodeIds] = useState<string[]>(
    collapseAll ? data.map((node) => node.id) : []
  );

  const onNodeClick = useCallback(
    (node: FlattenedTreeNode) =>
      node.collapsed
        ? setClosedNodeIds(closedNodeIds.filter((id) => id !== node.id))
        : setClosedNodeIds([...closedNodeIds, node.id]),
    [closedNodeIds]
  );

  const flattenNode = useCallback(
    (node: TreeNode, depth: number, result: FlattenedTreeNode[]) => {
      const { id, labelNode, children, showArrow } = node;
      const collapsed = closedNodeIds.includes(id);
      result.push({
        id,
        labelNode,
        showArrow: showArrow ?? true,
        hasChildren: (children ?? []).length > 0,
        depth,
        collapsed,
      });

      if (!collapsed && children) {
        for (const child of children) {
          flattenNode(child, depth + 1, result);
        }
      }
    },
    [closedNodeIds]
  );

  const flattenedData = useMemo(() => {
    const result: FlattenedTreeNode[] = [];
    for (const node of data) {
      flattenNode(node, 0, result);
    }
    return result;
  }, [data, flattenNode]);

  return (
    <div className={className}>
      {flattenedData.map((node) => (
        <TreeNode key={node.id} node={node} onClick={onNodeClick} />
      ))}
    </div>
  );
}

export default memo(Tree);
