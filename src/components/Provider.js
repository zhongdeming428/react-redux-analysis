import React, { useMemo, useEffect } from 'react'
import PropTypes from 'prop-types'
import { ReactReduxContext } from './Context'
import Subscription from '../utils/Subscription'

function Provider({ store, context, children }) {
  const contextValue = useMemo(() => {
    // 最外层的 Provider 提供了一个 subscrition 对象，没有传递第二个参数
    const subscription = new Subscription(store)
    // 这里指定了最高层的 subscription 对象的 onStateChange 属性为自身的 notifyNestedSubs 函数
    // 说明 store 变化时，会通知自身所有的 listeners，这些 listeners 属于
    // 其底层的监听者
    subscription.onStateChange = subscription.notifyNestedSubs
    return {
      store,
      subscription
    }
  }, [store])

  // contextValue 和 previousState 监听 store 的变化，如果 store 被替换了，那么需要重新计算这两个值
  // 这两个值的变化会导致整个组件树重新渲染，并且导致 effect 被执行，而 effect 的内容是重新订阅 store 的变化
  // 如果 store 没有被替换，那么只有 subscription 能够订阅到 store state 的更新，整个组件树不会重新渲染，effect 也不会触发

  const previousState = useMemo(() => store.getState(), [store])

  useEffect(() => {
    const { subscription } = contextValue
    // subscription 订阅 store state 的更新（基于 store.subscribe api）
    subscription.trySubscribe()

    if (previousState !== store.getState()) {
      subscription.notifyNestedSubs()
    }
    return () => {
      subscription.tryUnsubscribe()
      subscription.onStateChange = null
    }
  }, [contextValue, previousState])

  const Context = context || ReactReduxContext

  return <Context.Provider value={contextValue}>{children}</Context.Provider>
}

if (process.env.NODE_ENV !== 'production') {
  Provider.propTypes = {
    store: PropTypes.shape({
      subscribe: PropTypes.func.isRequired,
      dispatch: PropTypes.func.isRequired,
      getState: PropTypes.func.isRequired
    }),
    context: PropTypes.object,
    children: PropTypes.any
  }
}

export default Provider
