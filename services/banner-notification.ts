import { useState } from 'preact/hooks';

type Status = 'info' | 'success' | 'warning' | 'critical';

type BannerOptions = {
  status?: Status,
  title: string,
  content?: string,
  duration?: number;
};

export function useBannerNotification() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [status, setStatus] = useState<Status | null>(null);

  const show = ({ status = 'success', title, content, duration = 3000 }: BannerOptions) => {
    setIsVisible(true);
    setStatus(status);
    setTitle(title);
    content && setContent(content);

    setTimeout(() => {
      setIsVisible(false);
      setStatus(null);
      setTitle('');
      setContent('');
    }, duration);
  }

  return {
    show,
    isVisible,
    title,
    content,
    status,
  };
}
