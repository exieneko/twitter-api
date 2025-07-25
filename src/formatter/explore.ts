import { formatCursor, formatTweet, formatUser } from '.';

import { Entry, ExploreStories, Hashflag, Segment, TimelineExploreItem, Trend, TrendEvent, Tweet, User } from '../types';
import { _Cursor, _Entry, SegmentedTimelines } from '../types/raw';
import { _EventSummary, _Hashflag, _Trend } from '../types/raw/explore';
import { _ExplorePageItem, _ExploreSidebarItem, _ExploreStoriesItem, _ExploreTopicItem, _ExploreTrendItem, _ExploreWhoToFollowItem, _TweetItem } from '../types/raw/items';

export const formatExplorePage = (input: _Entry<_ExplorePageItem | _Cursor>[], segments: SegmentedTimelines['timelines']): Entry<TimelineExploreItem>[] => {
    // @ts-ignore
    return [
        ...input.map(entry => ({
            id: entry.entryId,
            content: entry.content.__typename === 'TimelineTimelineCursor'
                ? formatCursor(entry.content)
            : /^tweet/.test(entry.entryId) && Object.hasOwn(entry.content, 'items')
                ? {
                    __type: 'TweetList',
                    items: (entry.content as _ExploreTopicItem).items.map(item => formatTweet(item.item.itemContent.tweet_results.result, item.item.itemContent.hasModeratedReplies) as Tweet)
                }
            : /^tweet/.test(entry.entryId)
                ? formatTweet((entry.content as _TweetItem).itemContent.tweet_results.result, (entry.content as _TweetItem).itemContent.hasModeratedReplies) as Tweet
            : /^who-to-follow/.test(entry.entryId)
                ? {
                    __type: 'UserList',
                    items: (entry.content as _ExploreWhoToFollowItem).items.map(item => formatUser(item.item.itemContent.user_result.result) as User)
                }
            : /^stories/.test(entry.entryId)
                ? formatStories(entry.content as _ExploreStoriesItem)
            : (entry.content as _ExploreTrendItem).itemContent.__typename === 'TimelineTrend'
                ? formatTrend((entry.content as _ExploreTrendItem).itemContent as _Trend)
                : formatEventSummary((entry.content as _ExploreTrendItem).itemContent as _EventSummary)
        })),
        ...segments.map(segment => ({
            id: 'segment',
            content: {
                __type: 'Segment',
                id: segment.timeline.id,
                name: segment.id
            } satisfies Segment
        }))
    ]
};

export const formatGenericTimeline = (input: _Entry<_ExploreTrendItem<'Item'>>[]): Entry<Trend>[] => {
    return input.map(entry => entry.content.itemContent.__typename === 'TimelineTrend' ? {
        id: entry.entryId,
        content: formatTrend(entry.content.itemContent)
    } : null).filter(x => !!x);
};



export const formatEventSummary = (input: _EventSummary): TrendEvent => {
    return {
        __type: 'ExploreTrendEvent',
        id: input.event.rest_id,
        imageUrl: input.image.url,
        name: input.title,
        time: input.timeString,
        url: input.eventSummaryUrl.url
    };
};

export const formatTrend = (input: _Trend): Trend => {
    return {
        __type: 'ExploreTrend',
        name: input.name,
        location: input.trend_metadata.domain_context.match(/^Trending\sin\s(.+?)$/)?.at(1),
        topic: input.trend_metadata.domain_context.match(/^(.+?)\s·\sTrending$/)?.at(1),
        tweetsCount: input.trend_metadata.meta_description
            ? Number(input.trend_metadata.meta_description.match(/^([0-9,]+?)\s.*$/)?.at(1)?.replace(/\D/g, '')) || Number(input.trend_metadata.meta_description.match(/^([0-9\.]+?)K\s.*$/)?.at(1)) * 1000 || Number(input.trend_metadata.meta_description.match(/^([0-9\.]+?)M\s.*$/)?.at(1)) * 1000000
            : undefined,
        url: input.trend_url.url,
        groupedTrends: input.grouped_trends?.map(trend => ({
            name: trend.name,
            url: trend.url.url
        }))
    };
};

export const formatSidebarItem = (input: _ExploreSidebarItem) => {
    return input.items.map(item => item.item.itemContent.__typename === 'TimelineEventSummary'
        ? formatEventSummary(item.item.itemContent)
        : formatTrend(item.item.itemContent))
};

export const formatHashflag = (input: _Hashflag): Hashflag => {
    return {
        hashtag: input.hashtag,
        startTime: new Date(input.starting_timestamp_ms).toISOString(),
        endTime: new Date(input.ending_timestamp_ms).toISOString(),
        hashfetti: !!input.is_hashfetti_enabled,
        url: input.asset_url,
    };
};



export const formatStories = (input: _ExploreStoriesItem): ExploreStories => {
    return {
        __type: 'ExploreStories',
        items: input.items.map(item => ({
            ai: !!item.item.itemContent.is_ai_trend,
            highlightedAvatarUrls: item.item.itemContent.social_context.contextImageUrls || [],
            name: item.item.itemContent.name,
            text: item.item.itemContent.social_context.text,
            url: item.item.itemContent.trend_url.url
        }))
    };
};
