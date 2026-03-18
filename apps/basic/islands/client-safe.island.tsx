import { useEffect, useState } from "preact/hooks";
import { toast, Toaster } from "sonner";

// Export the harmony directive to skip SSR
export const harmony = { ssr: false };

export default function ToasterIsland() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    console.log("from the client!");
  }, []);
  return (
    <div>
      <Toaster />
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
