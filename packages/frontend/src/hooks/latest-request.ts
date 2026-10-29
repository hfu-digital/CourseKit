/** One owner per hook; abort transport and reject late custom-fetch completions. */
export class LatestRequest {
    private controller?: AbortController;
    begin() { this.cancel(); this.controller = new AbortController(); return this.controller.signal; }
    cancel() { this.controller?.abort(); }
}
