import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        title="Page not found"
        description="That page does not exist. It may have been archived or moved."
        action={
          <Link to="/today">
            <Button>Back to Today</Button>
          </Link>
        }
      />
    </div>
  )
}