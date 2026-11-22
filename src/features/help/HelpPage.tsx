import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, LifeBuoy, Mail, MessageCircle, Phone } from 'lucide-react';
import { Button, Card, CardBody, CardHeader } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useCapabilities } from '@/hooks/useCapabilities';
import { config } from '@/constants/config';
import { searchTopics, visibleTopics } from './content';

/** Help centre: answers to common vendor questions, for this vendor's features only. */
export function HelpPage() {
  const { can } = useCapabilities();
  const { hash } = useLocation();
  const [query, setQuery] = useState('');
  const topics = useMemo(() => visibleTopics(can), [can]);
  const results = useMemo(() => searchTopics(topics, query), [topics, query]);
  const support = config.support;
  const hasSupport = Boolean(support.phone || support.whatsapp || support.email);

  // Open and scroll to a shared answer (/help#question-id).
  useEffect(() => {
    const id = hash.replace('#', '');
    if (!id) return;
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) el.open = true;
    el?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <>
      <PageHeader title="Help" description="Answers to common questions about running your shop on TheNearByShop." />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Help topics" className="hidden lg:block">
          <ul className="sticky top-4 space-y-1 text-sm">
            {topics.map((t) => (
              <li key={t.id}>
                <a href={`#topic-${t.id}`} className="block rounded-md px-2 py-1 text-ink-muted hover:bg-ink/5 hover:text-ink">
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <SearchInput value={query} onChange={setQuery} placeholder="Search help, e.g. withdraw, printer, discount" label="Search help" />

          {results.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState icon={<LifeBuoy className="h-5 w-5" />} title="No answers found" description="Try other words, or contact us below." />
              </CardBody>
            </Card>
          ) : (
            results.map((t) => (
              <Card key={t.id} id={`topic-${t.id}`} className="scroll-mt-4">
                <CardHeader title={t.title} />
                <div className="divide-y divide-line">
                  {t.questions.map((q) => (
                    <details key={q.id} id={q.id} open={Boolean(query) || undefined} className="group scroll-mt-4 px-4 py-3">
                      <summary className="cursor-pointer list-none font-medium marker:hidden">
                        <span className="flex items-start justify-between gap-3">
                          {q.q}
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-90" aria-hidden />
                        </span>
                      </summary>
                      <div className="mt-2 space-y-2 text-sm text-ink-muted">
                        {q.a.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                        {q.links && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {q.links.map((l) => (
                              <Link key={l.to} to={l.to}>
                                <Button size="sm" variant="outline">
                                  {l.label}
                                </Button>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </Card>
            ))
          )}

          <Card>
            <CardHeader title="Still need help?" />
            <CardBody className="space-y-3 text-sm">
              {hasSupport ? (
                <>
                  <p className="text-ink-muted">Contact the TheNearByShop vendor support team. Tell us your shop name and, for an order, its number.</p>
                  <div className="flex flex-wrap gap-2">
                    {support.phone && (
                      <a href={`tel:${support.phone}`}>
                        <Button variant="outline" leftIcon={<Phone className="h-4 w-4" />}>
                          Call {support.phone}
                        </Button>
                      </a>
                    )}
                    {support.whatsapp && (
                      <a href={`https://wa.me/${support.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                        <Button variant="outline" leftIcon={<MessageCircle className="h-4 w-4" />}>
                          WhatsApp
                        </Button>
                      </a>
                    )}
                    {support.email && (
                      <a href={`mailto:${support.email}`}>
                        <Button variant="outline" leftIcon={<Mail className="h-4 w-4" />}>
                          {support.email}
                        </Button>
                      </a>
                    )}
                  </div>
                  {support.hours && <p className="text-xs text-ink-subtle">{support.hours}</p>}
                </>
              ) : (
                <p className="text-ink-muted">Contact your TheNearByShop business development executive or the vendor support team.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
