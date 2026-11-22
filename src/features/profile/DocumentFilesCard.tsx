import { useRef, useState } from 'react';
import { FileCheck2, FileClock, Upload } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Field, Select, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/utils/format';
import { useGetDocumentFilesQuery, useUploadDocumentFileMutation } from './api';

/** Upload GST certificate, PAN, licences etc.; new files are reviewed by the onboarding team. */
export function DocumentFilesCard() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useGetDocumentFilesQuery();
  const [upload, uploadState] = useUploadDocumentFileMutation();
  const [type, setType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !data) return <Skeleton className="h-40 w-full" />;

  const tooBig = file ? file.size > data.max_size_mb * 1024 * 1024 : false;
  const submit = async () => {
    if (!file || !type) return;
    const fd = new FormData();
    fd.append('document_type', type);
    fd.append('file', file);
    try {
      await upload(fd).unwrap();
      toast.success('Document uploaded', 'The TheNearByShop team will review it.');
      setFile(null);
      setType('');
      if (input.current) input.current.value = '';
    } catch (err) {
      toast.error('Upload failed', err);
    }
  };

  return (
    <Card>
      <CardHeader title="Document files" description="Re-upload a document if it was rejected, expired or changed." />
      <CardBody className="space-y-4 text-sm">
        {data.has_application ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Document type">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Choose…</option>
                {data.document_types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="File" error={tooBig ? `Max ${data.max_size_mb} MB` : undefined} hint={`${data.allowed_extensions.join(', ').toUpperCase()}, up to ${data.max_size_mb} MB`}>
              <input
                ref={input}
                type="file"
                aria-label="Document file"
                accept={data.allowed_extensions.map((e) => `.${e}`).join(',')}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink/5 file:px-3 file:py-1.5"
              />
            </Field>
            <Button leftIcon={<Upload className="h-4 w-4" />} loading={uploadState.isLoading} disabled={!file || !type || tooBig} onClick={submit}>
              Upload
            </Button>
          </div>
        ) : (
          <p className="text-ink-muted">Your shop was set up by our team, so documents are updated through support.</p>
        )}
        {data.results.length > 0 && (
          <ul className="divide-y divide-line rounded-md border border-line">
            {data.results.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex items-center gap-2">
                  {d.is_verified ? <FileCheck2 className="h-4 w-4 text-emerald-600" /> : <FileClock className="h-4 w-4 text-amber-600" />}
                  <span>
                    <span className="block font-medium">{d.document_type_display}</span>
                    <span className="text-xs text-ink-muted">
                      {d.file_name} · {formatDateTime(d.created_at)}
                    </span>
                  </span>
                </span>
                <Badge tone={d.is_verified ? 'success' : 'warning'}>{d.is_verified ? 'Verified' : 'In review'}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
