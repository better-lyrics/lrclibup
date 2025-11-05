<script lang="ts">
	import type { LRCValidationResult, IssueType } from "$lib/lrcValidator";
	import { getValidationSummary, getIssueTypeLabel } from "$lib/lrcValidator";

	interface Props {
		validationResult: LRCValidationResult;
		onNormalize?: () => void;
		onDismiss?: () => void;
	}

	let { validationResult, onNormalize, onDismiss }: Props = $props();

	const summary = $derived(getValidationSummary(validationResult));
	const showNormalizeButton = $derived(validationResult.hasMultiTimestamps);
	const hasErrors = $derived(validationResult.hasErrors);

	// Group issues by type
	const issuesByType = $derived.by(() => {
		const grouped = new Map<IssueType, typeof validationResult.issues>();
		validationResult.issues.forEach((issue) => {
			if (!grouped.has(issue.type)) {
				grouped.set(issue.type, []);
			}
			grouped.get(issue.type)!.push(issue);
		});
		return grouped;
	});

	let expandedTypes = $state<Set<IssueType>>(new Set());

	function toggleExpanded(type: IssueType) {
		if (expandedTypes.has(type)) {
			expandedTypes.delete(type);
		} else {
			expandedTypes.add(type);
		}
		expandedTypes = new Set(expandedTypes);
	}
</script>

<div
	class="{hasErrors ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'} border rounded-lg p-4 flex items-start gap-3 shadow-sm"
>

	<div class="flex-1">
		<!-- Header -->
		<div class="flex items-center justify-between mb-2">
			<h4 class="text-base font-semibold flex items-center gap-1.5 {hasErrors ? 'text-red-900' : 'text-amber-900'}">
				<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="2"
		stroke="currentColor"
		class="size-4 {hasErrors ? 'text-red-600' : 'text-amber-600'} flex-shrink-0 mt-0.5"
	>
		{#if hasErrors}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
			/>
		{:else}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
			/>
		{/if}
	</svg>
				{hasErrors ? 'LRC Format Errors Detected' : 'LRC Format Issues Detected'}
			</h4>
			{#if onDismiss}
				<button
					type="button"
					onclick={onDismiss}
					class="{hasErrors ? 'text-red-700 hover:text-red-900' : 'text-amber-700 hover:text-amber-900'} transition-colors"
					aria-label="Dismiss warning"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
						class="size-4"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M6 18 18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{/if}
		</div>

		<!-- Summary -->
		<p class="text-sm {hasErrors ? 'text-red-800' : 'text-amber-800'} mb-3">
			Found {summary} in your synced lyrics.
		</p>

		<!-- Issues Grouped by Type -->
		<div class="space-y-2 mb-3">
			{#each Array.from(issuesByType) as [type, issues]}
				<div class="border {hasErrors && issues[0].severity === 'error' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'} rounded-md overflow-hidden">
					<button
						type="button"
						onclick={() => toggleExpanded(type)}
						class="w-full px-3 py-2 flex items-center justify-between hover:bg-black/5 transition-colors"
					>
						<div class="flex items-center gap-2">
							{#if issues[0].severity === 'error'}
								<span class="text-xs font-semibold text-red-700 bg-red-200 px-2 py-0.5 rounded">ERROR</span>
							{:else}
								<span class="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded">WARNING</span>
							{/if}
							<span class="text-sm font-medium {issues[0].severity === 'error' ? 'text-red-900' : 'text-amber-900'}">
								{getIssueTypeLabel(type)}
							</span>
							<span class="text-xs {issues[0].severity === 'error' ? 'text-red-600' : 'text-amber-600'}">
								({issues.length} {issues.length === 1 ? 'line' : 'lines'})
							</span>
						</div>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
							class="size-4 {issues[0].severity === 'error' ? 'text-red-600' : 'text-amber-600'} transition-transform {expandedTypes.has(type) ? 'rotate-180' : ''}"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
						</svg>
					</button>

					{#if expandedTypes.has(type)}
						<div class="px-3 pt-2 pb-3 space-y-2">
							{#each issues as issue}
								<div class="text-xs space-y-1">
									<div class="flex items-start gap-2">
										<span class="{issue.severity === 'error' ? 'text-red-600' : 'text-amber-600'} font-mono">Line {issue.line}:</span>
										<span class="{issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'}">{issue.message}</span>
									</div>
									<code class="{issue.severity === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'} block px-2 py-1 rounded text-xs overflow-x-auto">
										{issue.raw}
									</code>
									{#if issue.suggestion}
										<p class="{issue.severity === 'error' ? 'text-red-600' : 'text-amber-600'} italic flex items-start gap-0.5">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="flex-shrink-0 mt-px size-3.5">
												<path fill="currentColor" d="M19.249 6.872a1 1 0 0 1 1.645.36a7.001 7.001 0 0 1-8.912 9.037l-4.013 4.013a3 3 0 1 1-4.243-4.243l4.013-4.013a7 7 0 0 1 9.025-8.917a1 1 0 0 1 .36 1.645L14.768 7.11a1.5 1.5 0 0 0 2.121 2.122z"/>
											</svg>
											<span>{issue.suggestion}</span>
										</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Explanation for Multi-timestamp -->
		{#if validationResult.hasMultiTimestamps}
			<div class="text-xs {hasErrors ? 'text-red-700 bg-red-100/50' : 'text-amber-700 bg-amber-100/50'} rounded p-2 mb-3">
				<p class="font-medium mb-1">About Multi-timestamp Format:</p>
				<p class="leading-relaxed">
					Lines like <code class="{hasErrors ? 'bg-red-200' : 'bg-amber-200'} px-1 rounded">[00:29.52][01:29.47] lyrics</code>
					are non-standard and may cause compatibility issues in many players including Better Lyrics.
				</p>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex gap-2">
			{#if showNormalizeButton && onNormalize}
				<button
					type="button"
					onclick={onNormalize}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
            {hasErrors ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'} text-white rounded-md
            transition-colors shadow-sm"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
						class="size-4"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
						/>
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
					</svg>
					Auto-fix to Standard Format
				</button>
			{/if}

			<button
				type="button"
				onclick={() => {
					if (onDismiss) onDismiss();
				}}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
          {hasErrors ? 'text-red-700 hover:text-red-900 hover:bg-red-100' : 'text-amber-700 hover:text-amber-900 hover:bg-amber-100'}
          rounded-md transition-colors"
			>
				Continue Anyway
			</button>
		</div>
	</div>
</div>
