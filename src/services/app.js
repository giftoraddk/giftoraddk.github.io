// Điểm vào duy nhất của Event Bus Global — layout cần domain nào thì mount 1 lần
// (import '@/services/app.js', xem pages/admin/[table].astro). Thêm domain = import service/event.js +
// service/service.js của nó rồi gọi setup — core/bus.js không biết gì về domain.
import { setupLlmChannels } from '@/packages/llm/service/event.js'
import '@/packages/llm/service/service.js'

setupLlmChannels()
