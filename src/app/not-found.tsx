import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-gray-500 mb-6">页面不存在</p>
      <Link href="/" className="text-blue-600 hover:underline">
        返回首页 →
      </Link>
    </div>
  );
}
