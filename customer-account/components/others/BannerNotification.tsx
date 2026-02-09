import { memo } from 'preact/compat';

type Props = {
  status?: 'info' | 'success' | 'warning' | 'critical',
  title: string,
  content?: string,
}

const BannerNotification: React.FC<Props> = ({ status = 'success', title, content }) => {
  return (
    <s-banner
      tone={status}
      heading={title}
    >
      {content && <s-text>{content}</s-text>}
    </s-banner>
  )
}

export default memo(BannerNotification);
