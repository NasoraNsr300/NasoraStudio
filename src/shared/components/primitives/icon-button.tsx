import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function IconButton({ children, type = "button", ...props }: IconButtonProps) {
  return (
    <button {...props} type={type}>
      {children}
    </button>
  );
}
