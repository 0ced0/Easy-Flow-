export default function PageLoading({message = 'Loading...'}) {
    return (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-[#cfdeea] bg-[#f9fcff] shadow-[0_8px_20px_rgba(28,72,109,0.08)]" role="status" aria-live="polite">
            <div className="size-7 animate-spin rounded-full border-3 border-[#1c5f9f]/20 border-t-[#1c5f9f]" aria-hidden="true"></div>
            <p className="text-[0.75rem] text-[#54708a]">{message}</p>
        </main>
    )
}
