import React from "react";
import TextInput from "./TextInput";

type Props = Omit<React.ComponentProps<typeof TextInput>, "type">;

export default function PasswordInput(props: Props) {
  const [show, setShow] = React.useState(false);
  const inputId =
    (props.id as string) ||
    `pwd-${props.label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="relative">
      <TextInput id={inputId} {...props} type={show ? "text" : "password"} />
      <button
        type="button"
        aria-controls={inputId}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-[34px] text-xs text-gray-400 hover:text-gray-200"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
