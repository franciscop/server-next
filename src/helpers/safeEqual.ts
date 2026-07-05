// Constant-time string comparison, so comparing a shared secret doesn't leak it
// through timing. Dependency-free and works on every runtime. (The length check
// leaks only the length, which is not sensitive for a high-entropy key.)
export default function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}
