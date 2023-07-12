import { useState, useEffect, useRef } from 'react';

const useQueueState = <T>(initialState: T, delay: number) => {
	const [state, setState] = useState(initialState);
	const queueRef = useRef<Array<T>>([]);
	const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

	const setQueuedState = (newState: T) => {
		queueRef.current.push(newState);
		processQueue();
	};

	const processQueue = () => {
		if (timeoutIdRef.current === null && queueRef.current.length > 0) {
			const nextState = queueRef.current.shift() as T;
			setState(nextState);

			timeoutIdRef.current = setTimeout(() => {
				timeoutIdRef.current = null;
				processQueue();
			}, delay);
		}
	};

	// @todo cleanup on unmount

	useEffect(() => {
		if (state === initialState) return;
		setQueuedState(initialState);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialState]);

	return state;
};

export default useQueueState;