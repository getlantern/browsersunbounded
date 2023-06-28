import {Container, Text} from './styles'
import {StateEmitter, useEmitterState} from '../../../hooks/useStateEmitter'
import {useEffect, useState} from 'react'

interface Notification {
	text: string
	ellipse?: boolean
	show?: boolean
}

const notificationQueue = new StateEmitter<Notification[]>([])
export const pushNotification = (notification: Notification) => notificationQueue.update([...notificationQueue.state, notification])

export const Notification = () => {
	const notifications = useEmitterState(notificationQueue)
	const [notification, setNotification] = useState<Notification | null>(null)
	const show = notification?.show ?? false

	useEffect(() => {
		if (notifications.length === 0) return setNotification(null)
		if (notification) return

		let hideTimeout: ReturnType<typeof setTimeout> | null = null
		let destroyTimeout: ReturnType<typeof setTimeout> | null = null
		const hideNotification = () => {
			hideTimeout = setTimeout(() => {
				// @ts-ignore
				setNotification({...notifications[0], show: false})
				destroyTimeout = setTimeout(() => {
					notificationQueue.update(notifications.slice(1))
					setNotification(null)
				}, 1000)
			}, 4000)
		}
		setNotification({...notifications[0], show: true})
		hideNotification()

		// return () => {
		// 	if (hideTimeout) clearTimeout(hideTimeout)
		// 	if (destroyTimeout) clearTimeout(destroyTimeout)
		// }
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [notifications])


	return (
		<Container
			style={{
				top: 'unset',
				bottom: show ? 0 : -10,
				opacity: show ? 1 : 0,
			}}
		>
			<Text>{notification?.text}</Text>
		</Container>
	)
}