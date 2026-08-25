import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;

/**
 * Paged list + infinite Swiper helpers (load more near end / onReachEnd).
 * On filter/deps change: keeps previous items until the new page-1 response
 * arrives, and exposes `refreshing` so UI can show a stable loader overlay.
 */
export function usePagedSwiper({ fetchPage, pageSize = DEFAULT_PAGE_SIZE, deps = [] }) {
  const swiperRef = useRef(null);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const seenIdsRef = useRef(new Set());
  const fetchPageRef = useRef(fetchPage);
  const requestSeqRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  fetchPageRef.current = fetchPage;

  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reset = useCallback(() => {
    pageRef.current = 0;
    hasMoreRef.current = true;
    loadingRef.current = false;
    seenIdsRef.current = new Set();
    hasLoadedOnceRef.current = false;
    setItems([]);
    setInitialLoading(true);
    setRefreshing(false);
    setLoadingMore(false);
    setReloadKey((k) => k + 1);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    loadingRef.current = true;
    const nextPage = pageRef.current + 1;
    const requestSeq = requestSeqRef.current;
    if (nextPage > 1) setLoadingMore(true);

    try {
      const data = await fetchPageRef.current({ page: nextPage, limit: pageSize });
      if (requestSeq !== requestSeqRef.current) return;

      const rows = Array.isArray(data?.items) ? data.items : [];
      const mapped = rows.filter((item) => {
        const id = item?.id;
        if (id == null || seenIdsRef.current.has(id)) return false;
        seenIdsRef.current.add(id);
        return true;
      });

      setItems((prev) => (nextPage === 1 ? mapped : [...prev, ...mapped]));
      hasLoadedOnceRef.current = true;

      const pagination = data?.pagination;
      const totalPages = Math.max(1, Number(pagination?.pages) || 1);
      const received = rows.length;
      const moreByPage = nextPage < totalPages;
      const moreByBatch = received >= pageSize;
      hasMoreRef.current =
        received > 0 && (moreByPage || (pagination?.pages == null && moreByBatch));
      pageRef.current = nextPage;

      queueMicrotask(() => {
        if (requestSeq !== requestSeqRef.current) return;
        const swiper = swiperRef.current;
        if (!swiper || !hasMoreRef.current || loadingRef.current) return;
        if (swiper.isEnd) {
          loadMore();
        }
      });
    } catch {
      if (requestSeq !== requestSeqRef.current) return;
      if (nextPage === 1) {
        setItems([]);
        hasMoreRef.current = false;
      }
    } finally {
      if (requestSeq === requestSeqRef.current) {
        loadingRef.current = false;
        setLoadingMore(false);
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [pageSize]);

  useEffect(() => {
    requestSeqRef.current += 1;
    pageRef.current = 0;
    hasMoreRef.current = true;
    loadingRef.current = false;
    seenIdsRef.current = new Set();
    setLoadingMore(false);

    if (hasLoadedOnceRef.current) {
      setRefreshing(true);
      setInitialLoading(false);
    } else {
      setInitialLoading(true);
      setRefreshing(false);
    }

    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMore, reloadKey, ...deps]);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    swiper.update();
  }, [items]);

  const maybeLoadMore = useCallback(
    (swiper) => {
      if (!swiper || !hasMoreRef.current || loadingRef.current) return;
      const perView = Math.ceil(Number(swiper.params.slidesPerView) || 1);
      const nearEnd = swiper.activeIndex >= swiper.slides.length - perView - 1;
      if (nearEnd || swiper.isEnd) {
        loadMore();
      }
    },
    [loadMore]
  );

  return {
    items,
    initialLoading,
    refreshing,
    loadingMore,
    hasMore: hasMoreRef,
    swiperRef,
    maybeLoadMore,
    loadMore,
    reset,
  };
}
