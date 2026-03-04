import { CheckCircle, User, Car, FileText, ImageOff, ExternalLink } from 'lucide-react'
import type { User as UserEntity } from '../../../../domain/entities/User'
import { Card } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Avatar } from '../../ui/Avatar'

const S3_BASE_URL = import.meta.env.VITE_S3_BASE_URL as string | undefined

function s3Url(key: string): string {
  return S3_BASE_URL ? `${S3_BASE_URL}/${key}` : key
}

interface DocumentSlotProps {
  label: string
  icon: React.ReactNode
  s3Key?: string
}

function DocumentSlot({ label, icon, s3Key }: DocumentSlotProps) {
  if (s3Key) {
    return (
      <a
        href={s3Url(s3Key)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        {icon}
        {label}
        <ExternalLink size={10} className="opacity-60" />
      </a>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
      <ImageOff size={12} className="shrink-0" />
      {label} — <span className="text-warning/80">ainda não enviado</span>
    </div>
  )
}

interface DriverApprovalCardProps {
  driver: UserEntity
  onApprove: (id: string) => void
  isApproving?: boolean
}

export function DriverApprovalCard({ driver, onApprove, isApproving }: DriverApprovalCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Avatar src={driver.profileImage} name={driver.name} size="md" />
        <div className="flex-1 min-w-0">

          {/* Nome + status */}
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-foreground truncate">{driver.name}</p>
            <Badge color={driver.isApproved ? 'success' : 'warning'}>
              {driver.isApproved ? 'Aprovado' : 'Pendente'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{driver.email}</p>

          {/* Dados do veículo */}
          <div className="mt-2 space-y-1">
            {driver.licensePlate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Car size={12} />
                {driver.vehicleModel} {driver.vehicleYear} — {driver.licensePlate}
              </div>
            )}
            {driver.document && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User size={12} />
                CPF: {driver.document}
              </div>
            )}
          </div>

          {/* Documentos */}
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Documentos
            </p>
            <DocumentSlot
              label="CNH"
              icon={<FileText size={12} className="shrink-0" />}
              s3Key={driver.driverLicenseImage}
            />
            <DocumentSlot
              label="Doc. do veículo"
              icon={<Car size={12} className="shrink-0" />}
              s3Key={driver.vehicleDocImage}
            />
          </div>

          {/* Botão de aprovação */}
          {driver.needsApproval() && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                loading={isApproving}
                onClick={() => onApprove(driver.id)}
                className="gap-1.5"
              >
                <CheckCircle size={13} />
                Aprovar motorista
              </Button>
            </div>
          )}

        </div>
      </div>
    </Card>
  )
}
