import {Container, Text} from './styles'
import {StateEmitter, useEmitterState} from '../../../hooks/useStateEmitter'
import {useEffect, useState} from 'react'
import {usePrevious} from '../../../hooks/usePrevious'
import {Ellipse} from '../../atoms/ellipse'

interface NotificationType {
	id: number
	text: string
	autoHide?: boolean
	ellipse?: boolean
	show?: boolean
	timeoutHide?: ReturnType<typeof setTimeout> | null
	timeoutRemove?: ReturnType<typeof setTimeout> | null
}

const notificationQueue = new StateEmitter<NotificationType[]>([])
export const pushNotification = (notification: NotificationType) => {
	notificationQueue.update([...notificationQueue.state, notification])
}

export const removeNotification = (id: number) => {
	notificationQueue.update(notificationQueue.state.filter(n => n.id !== id))
}

export const Notification = () => {
	const notifications = useEmitterState(notificationQueue)
	const prevNotifications = usePrevious(notifications)
	const [notification, setNotification] = useState<NotificationType | null>(null)
	const show = notification?.show ?? false

	useEffect(() => {
		// find all removed notifications
		const removedNotifications = prevNotifications?.filter(n => !notifications.find(n2 => n.id === n2.id)) ?? []
		// if the notification is already showing, set show to false and remove it
		if (notification && removedNotifications.find(n => n.id === notification.id)) {
			if (notification.timeoutHide) clearTimeout(notification.timeoutHide)
			if (notification.timeoutRemove) clearTimeout(notification.timeoutRemove)
			const timeoutRemove = setTimeout(() => setNotification(null), 1000)
			setNotification({...notification, show: false, timeoutRemove})
		}

		if (!notifications[0]) return;

		// if the notification at index 0 is already showing, return
		if (notification?.id === notifications[0].id) return

		setNotification({...notifications[0], show: true})

		if (!notifications[0].autoHide) return

		const timeoutHide = setTimeout(() => {
			const timeoutRemove = setTimeout(() => {
				removeNotification(notifications[0].id!)
				setNotification(null)
			}, 1000)
			setNotification({...notifications[0], show: false, timeoutRemove})
		}, 4000)

		setNotification({...notifications[0], show: true, timeoutHide})
	}, [notification, notifications, prevNotifications])

	return (
		<Container
			style={{
				top: 'unset',
				bottom: show ? 0 : -10,
				opacity: show ? 1 : 0,
			}}
		>
			<Text>{notification?.text}{notification?.ellipse && <Ellipse />}</Text>
		</Container>
	)
}