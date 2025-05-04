import { json } from "@remix-run/node";

export const loader = async () => {
  return json({});
};

export default function ComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Coming Soon</h1>
        <p className="text-xl text-gray-600 mb-8">
          We're working on something exciting! Stay tuned for updates.
        </p>
        <div className="animate-pulse">
          <div className="h-2 w-20 bg-gray-300 rounded mx-auto"></div>
        </div>
      </div>
    </div>
  );
} 