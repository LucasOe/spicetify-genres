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
