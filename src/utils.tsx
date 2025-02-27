export async function waitForElement(selector: string, timeout: number | undefined): Promise<Element | null> {
	return new Promise((resolve) => {
		let selection = document.querySelector(selector);
		if (selection) {
			return resolve(selection);
		}

		let observer = new MutationObserver(async () => {
			let selection = document.querySelector(selector);
			if (selection) {
				resolve(selection);
				observer.disconnect();
			} else {
				if (timeout) {
					async function timeOver(): Promise<null> {
						return new Promise((resolve) => {
							setTimeout(() => {
								observer.disconnect();
								resolve(null);
							}, timeout);
						});
					}
					resolve(await timeOver());
				}
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});
}

export function camelize(str: string): string {
	return str.replace(/(^\w{1})|([\s-]+\w{1})/g, (c) => c.toUpperCase());
}

export function replaceAll(str: string, find: string, replace: string) {
	return str.replace(new RegExp(find, "g"), replace);
}

export function debounce(fn: Function, ms = 300) {
	let timeoutId: ReturnType<typeof setTimeout>;
	return function (this: any, ...args: any[]) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn.apply(this, args), ms);
	};
}
