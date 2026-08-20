import NightSceneBackground from "./components/background/NightSceneBackground";
import AuthCard from "./components/auth/AuthCard";

export default function App() {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center px-4 py-10 sm:px-8">
      <NightSceneBackground />
      <main className="flex w-full justify-center">
        <AuthCard />
      </main>
    </div>
  );
}
