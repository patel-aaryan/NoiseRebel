import { auth } from "@/auth";
import { signInWithDiscord, signOutAction } from "@/app/actions";
import { Button } from "@noise-rebel/ui/components/button";

import { RequestForm } from "@/components/request-form";

export default async function Page() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">NoiseRebel</h1>
        {session?.user ? (
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out{session.user.name ? ` (${session.user.name})` : ""}
            </Button>
          </form>
        ) : null}
      </header>

      {session?.user ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Submit a join sound for someone else. The admin will review it before the bot starts
            playing it.
          </p>
          <RequestForm />
        </section>
      ) : (
        <section className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            Sign in with Discord to submit a request.
          </p>
          <form action={signInWithDiscord}>
            <Button type="submit">Sign in with Discord</Button>
          </form>
        </section>
      )}
    </main>
  );
}
