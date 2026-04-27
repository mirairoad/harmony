import { useEffect, useState } from "preact/hooks";
import { toast, Toaster } from "sonner";
import { ClientOnly } from "@hushkey/howl/client";

// Export the howl directive to skip SSR
export const howl = {
  ssr: true,
};

export default function ToasterIsland() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    console.log("from the client!");
  }, []);
  return (
    <div>
      <ClientOnly>
        {() => <Toaster />}
      </ClientOnly>
      <p>Hello world</p>

      <button
        type="button"
        class="btn btn-primary border-2 border-gray-300 rounded-md px-4 py-2"
        onClick={() => {
          setCount((c) => c + 1);
          toast.success(`${count + 1}`);
        }}
      >
        Count: {count}
      </button>
    </div>
  );
}
