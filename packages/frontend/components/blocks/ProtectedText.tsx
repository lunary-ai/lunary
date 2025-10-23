import { useOrg } from "@/utils/dataHooks";
import type { ReactNode } from "react";
import { Children, cloneElement, isValidElement } from "react";

type ProtectedTextProps = { children: ReactNode };

export default function ProtectedText({ children }: ProtectedTextProps) {
  const { org } = useOrg();
  const limited = !!org?.limited;

  const mask = (text: string) => text.replace(/\S/g, "X");

  const replaceNode = (node: ReactNode): ReactNode => {
    if (node == null || typeof node === "boolean") return node;

    if (typeof node === "string") return mask(node);
    if (typeof node === "number") return mask(String(node));

    if (Array.isArray(node)) {
      return Children.map(node, replaceNode);
    }

    if (isValidElement(node)) {
      const nextChildren = replaceNode(node.props?.children as ReactNode);
      return cloneElement(node, { children: nextChildren });
    }

    return node;
  };

  if (!limited) return children;

  if (typeof children === "string") {
    const fakeChars = mask(children);
    return <span className="limited">{fakeChars}</span>;
  }

  return Children.map(children, replaceNode);
}
