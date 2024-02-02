import {Container, Text} from './styles'
import {StateEmitter, useEmitterState} from '../../../hooks/useStateEmitter'
import {useEffect, useState} from 'react'
import {Ellipse} from '../../atoms/ellipse'
import Explosion from './explosion'

interface NotificationType {
	id: number
	text: string
	autoHide?: boolean
	ellipse?: boolean
	heart?: boolean
	show?: boolean
	timeoutHide?: ReturnType<typeof setTimeout> | null
	timeoutRemove?: ReturnType<typeof setTimeout> | null
}

const notificationQueue = new StateEmitter<NotificationType[]>([])
export const pushNotification = (notification: NotificationType) => {
	const index = notificationQueue.state.findIndex(n => n.id === notification.id)
	if (index >= 0) {
		notificationQueue.state[index] = notification
		return notificationQueue.update([...notificationQueue.state])
	}
	notificationQueue.update([...notificationQueue.state, notification])
}

export const removeNotification = (id: number) => {
	notificationQueue.update(notificationQueue.state.filter(n => n.id !== id))
}

export const Notification = () => {
	const notifications = useEmitterState(notificationQueue)
	const [notification, setNotification] = useState<NotificationType | null>(null)
	const show = notification?.show ?? false

	useEffect(() => {
		if (!notifications.length) return setNotification(null)

		// if the notification is already showing, set show to false and remove it
		if (notification && !notification.autoHide && !notification.timeoutRemove) {
			if (notifications.length > 1) {
				const timeoutRemove = setTimeout(() => removeNotification(notification.id), 750)
				return setNotification({...notification, show: false, timeoutRemove})
			}
		}

		if (notification && notification.id === notifications[0].id) return // same notification
		if (!notifications[0].autoHide) return setNotification({...notifications[0], show: true})

		const timeoutHide = setTimeout(() => {
			const timeoutRemove = setTimeout(() => removeNotification(notifications[0].id), 750)
			setNotification({...notifications[0], show: false, timeoutRemove})
		}, 3500)

		setNotification({...notifications[0], show: true, timeoutHide})
	}, [notification, notifications])

	return (
		<Container
			style={{
				top: 'unset',
				bottom: show ? 0 : -10,
				opacity: show ? 1 : 0,
			}}
		>
			{
				notification?.heart && (
					<Explosion
						id={notification.id}
					/>
				)
			}
			<Text>{notification?.text}{notification?.ellipse && <Ellipse />}</Text>
		</Container>
	)
}